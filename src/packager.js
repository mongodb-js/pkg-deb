'use strict'

const { promisify } = require('util')

const getDefaultsFromPackageJSON = require('./defaults')
const exec = promisify(require('child_process').exec)
const fsize = promisify(require('get-folder-size'))
const createTemplatedFile = require('./template')
const getMaintainer = require('./get-maintainer')
const sanitizeName = require('./sanitize-name')
const readMetadata = require('./read-metadata')
const tmp = require('tmp-promise')
const wrap = require('word-wrap')
const debug = require('debug')
const fs = require('fs-extra')
const path = require('path')

const defaultLogger = debug('pkg-deb')

tmp.setGracefulCleanup()

module.exports = async function (data) {
  if (process.umask() !== 0o0022 && process.umask() !== 0o0002) {
    console.warn(`The current umask, ${process.umask().toString(8)}, is not supported. You should use 0022 or 0002`)
  }

  const pkgDeb = new PackageDebian(data)

  await pkgDeb.generateDefaults()
  await pkgDeb.createStagingDir()
  await pkgDeb.copyApplication()
  await pkgDeb.createControl()
  await pkgDeb.createPackage()
  await pkgDeb.writePackage()
}

module.exports.PackageDebian = PackageDebian

function PackageDebian (options) {
  if (!(this instanceof PackageDebian)) return new PackageDebian(options)

  this.logger = options.logger || defaultLogger
  this.version = options.version
  this.input = options.input
  this.arch = options.arch
  this.name = options.name
  this.dest = options.dest
  this.src = options.src
  // packaged up debian package has to be underscored
  this.packageName = `${this.name}_${this.version}_${this.arch}`
}

/**
 * Package everything in staginDir using `dpkg`. At this point stagingDir has
 * the binary and DEBIAN/control files necessary to package a binary.
 */
PackageDebian.prototype.createPackage = async function () {
  this.logger(`Creating package at ${this.stagingDir}`)
  // NOTE: depending on how this gets run on evergreen, we might need to use
  // dpkg-deb, and run it through fakeroot.
  const output = await exec(`dpkg --build ${this.stagingDir}`)

  this.logger('dpkg-deb output:', output)
}

/**
 * Copies the created package that was written to tmp directory into the
 * provided destination.
 */
PackageDebian.prototype.writePackage = async function () {
  this.logger(`Copying package to ${this.dest}`)
  const outputPackage = path.join(this.dest, `${this.packageName}.deb`)
  await fs.copy(path.join(this.dir.path, `${this.packageName}.deb`), outputPackage)
}

/**
 * Get the hash of default options for the pkgDeb. Some come from the info
 * read from `package.json`, and some are hardcoded.
 *
 * Maintainer, version, and descriptions are adjusted to what is acceptable by
 * Debian.
 */
PackageDebian.prototype.generateDefaults = async function () {
  const [pkg, size] = await Promise.all([
    (async () => (await readMetadata({ src: this.src, logger: this.logger })) || {})(),
    fsize(this.input)
  ])

  this.options = Object.assign(getDefaultsFromPackageJSON(pkg), {
    version: transformVersion(this.version || '0.0.0'),

    section: 'utils',
    priority: 'optional',
    size: Math.ceil((size || 0) / 1024),

    maintainer: getMaintainer(pkg.author),
    // TODO: the next options should be accepted as package options
    depends: [],
    recommends: [],
    suggests: [],
    enhances: [],
    preDepends: [],
    lintianOverrides: []
  })

  this.options.arch = this.arch
  this.options.name = sanitizeName(this.options.name)

  if (!this.options.description && !this.options.productDescription) {
    throw new Error("No Description or ProductDescription provided. Please set either a description in the app's package.json or provide it in the this.options.")
  }

  if (this.options.description) {
    this.options.description = normalizeDescription(this.options.description)
  }

  if (this.options.productDescription) {
    this.options.productDescription = normalizeExtendedDescription(this.options.productDescription)
  }

  return this.options
}

/**
 * Create temporary directory where the contents of the package will live.
 */
PackageDebian.prototype.createStagingDir = async function () {
  this.logger('Creating staging directory')

  // keep this on the prototype, since we want to copy the packaged binary from
  // here at the end.
  this.dir = await tmp.dir({ prefix: 'pkg-deb-', unsafeCleanup: true })
  // TODO: file name needs to be taken from opts
  this.stagingDir = path.join(this.dir.path, this.packageName)
  return fs.ensureDir(this.stagingDir, '0755')
}

/**
 * Copies the binary provided to PackageDebian as input into the staging directory.
 */
PackageDebian.prototype.copyApplication = async function () {
  this.logger(`Copying application to ${this.stagingDir}`)
  await fs.ensureDir(this.stagingDir, '0755')
  // because we are packaging a binary, we need to make sure it's bundled in
  // /usr/local/bin
  const executable = path.join(this.stagingDir, '/usr/local/bin', this.name)
  await fs.copy(this.input, executable)
  await fs.chmod(executable, 0o755)
}

/**
 * Creates the control file for the package.
 *
 * See: https://www.debian.org/doc/debian-policy/ch-controlfields.html
 */
PackageDebian.prototype.createControl = async function () {
  const src = path.resolve(__dirname, '../resources/control.ejs')
  const dest = path.join(this.stagingDir, 'DEBIAN', 'control')
  this.logger(`Creating control file at ${dest}`)

  return await createTemplatedFile(src, dest, this.options)
}

/**
 * Transforms a SemVer version into a Debian-style version.
 *
 * Use '~' on pre-releases for proper Debian version ordering.
 * See https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-Version
 */
function transformVersion (version) {
  return version.replace(/(\d)[_.+-]?((RC|rc|pre|dev|beta|alpha)[_.+-]?\d*)$/, '$1~$2')
}

/**
 * Normalize the description by replacing all newlines in the description with spaces, since it's
 * supposed to be one line.
 */
function normalizeDescription (description) {
  return description.replace(/[\r\n]+/g, ' ')
}

/**
 * Ensure blank lines have the "." that denotes a blank line in the control file. Wrap any
 * extended description lines to avoid lintian warnings about
 * `extended-description-line-too-long`.
 */
function normalizeExtendedDescription (extendedDescription) {
  return extendedDescription
    .replace(/\r\n/g, '\n') // Fixes errors when finding blank lines in Windows
    .replace(/^$/mg, '.')
    .split('\n')
    .map(line => wrap(line, { width: 80, indent: ' ' }))
    .join('\n')
}
