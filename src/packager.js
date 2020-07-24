'use strict'

const { promisify } = require('util')

const getDefaultsFromPackageJSON = require('./defaults')
const exec = promisify(require('child_process').exec)
const fsize = promisify(require('get-folder-size'))
const createTemplatedFile = require('./template')
const getMaintainer = require('./get-maintainer')
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
  await fs.copy(path.join(this.dir.path, `${this.packageName}.deb`), this.dest)
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
    (async () => (await readMetadata({ input: this.src, logger: this.logger })) || {})(),
    fsize(this.input)
  ])

  this.options = Object.assign(getDefaultsFromPackageJSON(pkg), {
    version: transformVersion(this.version || '0.0.0'),

    section: 'utils',
    priority: 'optional',
    size: Math.ceil((size || 0) / 1024),

    maintainer: getMaintainer(pkg.author),
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
  await fs.copy(this.input, path.join(this.stagingDir, this.name))
    .catch(function (e) {
      console.log('copy error', e)
    })
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
 * Sanitize package name per Debian docs:
 * https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-source
 */
function sanitizeName (name) {
  const sanitized = replaceScopeName(name.toLowerCase(), '-').replace(new RegExp(`[^${'-+.a-z0-9'}]`, 'g'), '-')
  if (sanitized.length < 2) {
    throw new Error('Package name must be at least two characters')
  }
  if (/^[^a-z0-9]/.test(sanitized)) {
    throw new Error('Package name must start with an ASCII number or letter')
  }

  return sanitized
}

/**
 * Normalizes a scoped package name for use as an OS package name.
 *
 * @param {?string} [name=''] - the Node package name to normalize
 * @param {?string} [divider='-'] - the character(s) to replace slashes with
 */
function replaceScopeName (name, divider) {
  name = name || ''
  divider = divider || '-'
  return name.replace(/^@/, '').replace('/', divider)
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

//   /**
//    * Copy debian scripts.
//    */
//   copyScripts () {
//     const scriptNames = ['preinst', 'postinst', 'prerm', 'postrm']
//
//     return common.wrapError('creating script files', async () =>
//       Promise.all(_.map(this.options.scripts, async (item, key) => {
//         if (scriptNames.includes(key)) {
//           const scriptFile = path.join(this.stagingDir, 'DEBIAN', key)
//           this.options.logger(`Creating script file at ${scriptFile}`)
//
//           await fs.copy(item, scriptFile)
//           return fs.chmod(scriptFile, 0o755)
//         } else {
//           throw new Error(`Wrong executable script name: ${key}`)
//         }
//       }))
//     )
//   }
//
//   /**
//    * Create lintian overrides for the package.
//    */
//   async createOverrides () {
//     const src = path.resolve(__dirname, '../resources/overrides.ejs')
//     const dest = path.join(this.stagingDir, this.baseAppDir, 'share/lintian/overrides', this.options.name)
//     this.options.logger(`Creating lintian overrides at ${dest}`)
//
//     return common.wrapError('creating lintian overrides file', async () => this.createTemplatedFile(src, dest, '0644'))
//   }
