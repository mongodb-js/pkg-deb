'use strict'

const { promisify } = require('util')

const _ = require('lodash')
const getDefaultsFromPackageJSON = require('./defaults')
const tmp = require('tmp-promise')
const readMetadata = require('./read-metadata')
const debug = require('debug')
const fs = require('fs-extra')
const fsize = promisify(require('get-folder-size'))
const parseAuthor = require('parse-author')
const path = require('path')
const template = require('./template')
const wrap = require('word-wrap')
const exec = promisify(require('child_process').exec);

const debianDependencies = require('./dependencies')
const spawn = require('./spawn')

const defaultLogger = debug('debian-installer')

const defaultRename = (dest, src) => {
  return path.join(dest, '<%= name %>_<%= version %><% if (revision) { %>-<%= revision %><% } %>_<%= arch %>.deb')
}

tmp.setGracefulCleanup()

module.exports = async data => {
  if (process.umask() !== 0o0022 && process.umask() !== 0o0002) {
    console.warn(`The current umask, ${process.umask().toString(8)}, is not supported. You should use 0022 or 0002`)
  }

  const installer = new DebianInstaller(data)

  await installer.generateDefaults()
  // await installer.generateOptions()
  // await installer.createContents()
  await installer.createStagingDir()
  await installer.createControl();
  await installer.createPackage()
  installer.logger(`Successfully created package at ${installer.dest}`)
  return 
  // return installer.options
}

module.exports.Installer = DebianInstaller
module.exports.transformVersion = transformVersion

/**
 * Transforms a SemVer version into a Debian-style version.
 *
 * Use '~' on pre-releases for proper Debian version ordering.
 * See https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-Version
 */
function transformVersion (version) {
  return version.replace(/(\d)[_.+-]?((RC|rc|pre|dev|beta|alpha)[_.+-]?\d*)$/, '$1~$2')
}

function DebianInstaller (options) {
  if (!(this instanceof DebianInstaller)) return new DebianInstaller(options)

  // const options = {
  //   sourceDir: input,
  //   dest: filename,
  //   version: version,
  //   outputDir: outputDir,
  //   arch: 'amd64'
  // }

  this.logger = options.logger || defaultLogger
  this.rename = options.rename || defaultRename
  this.packageJSON = options.packageJSON
  this.sourceDir = options.sourceDir
  this.outputDir = options.outputDir
  this.version = options.version
  this.arch = options.arch
  this.dest = options.dest
  // this.userSupplied = options.userSupplied
  // this.scripts = options.scripts
  // this.name = options.name
}

/**
 * Get the hash of default options for the installer. Some come from the info
 * read from `package.json`, and some are hardcoded.
 */
DebianInstaller.prototype.generateDefaults = async function () {
  const [pkg, size] = await Promise.all([
    (async () => (await readMetadata({ sourceDir: this.sourceDir, logger: this.logger })) || {})(),
    fsize(this.sourceDir),
  ])

  this.options = Object.assign(getDefaultsFromPackageJSON(pkg), {
    version: transformVersion(this.version || '0.0.0'),

    section: 'utils',
    priority: 'optional',
    size: Math.ceil((size || 0) / 1024),

    maintainer: this.getMaintainer(pkg.author || pkg.contributors),

    lintianOverrides: []
  }, debianDependencies.forElectron(this.version))

  this.options.name = this.sanitizeName(this.options.name)

  if (!this.options.description && !this.options.productDescription) {
    throw new Error("No Description or ProductDescription provided. Please set either a description in the app's package.json or provide it in the this.options.")
  }

  if (this.options.description) {
    this.options.description = this.normalizeDescription(this.options.description)
  }

  if (this.options.productDescription) {
    this.options.productDescription = this.normalizeExtendedDescription(this.options.productDescription)
  }

  return this.options
}

/**
 * Flattens and merges default values, CLI-supplied options, and API-supplied options.
 */
// DebianInstaller.prototype.generateOptions = function() {
//   this.options = _.defaults({}, this.userSupplied, this.userSupplied.options, this.options)
// 
//   // Create array with unique values from default & user-supplied dependencies
//   for (const prop of ['depends', 'recommends', 'suggests', 'enhances', 'preDepends']) {
//     this.options[prop] = common.mergeUserSpecified(this.userSupplied, prop, this.options)
//   }
// 
//   return this.options
// }

/**
 * Package everything using `dpkg` and `fakeroot`.
 */
DebianInstaller.prototype.createPackage = async function() {
  this.logger(`Creating package at ${this.stagingDir}`)

  const output = await exec(`dpkg-deb --build ${this.stagingDir}`)
  this.logger(`dpkg-deb output: ${output}`)
}

/**
 * Create temporary directory where the contents of the package will live.
 */
DebianInstaller.prototype.createStagingDir = async function () {
  this.logger('Creating staging directory')

  const dir = await tmp.dir({ prefix: 'debian-installer-', unsafeCleanup: true })
  // TODO: file name needs to be taken from opts
  this.stagingDir = path.join(dir.path, `mongosh_0.0.6_amd64`)
  return fs.ensureDir(this.stagingDir, '0755')
}

/**
 * Creates the control file for the package.
 *
 * See: https://www.debian.org/doc/debian-policy/ch-controlfields.html
 */
DebianInstaller.prototype.createControl = async function () {
  const src = path.resolve(__dirname, '../resources/control.ejs')
  const dest = path.join(this.stagingDir, 'DEBIAN', 'control')
  this.logger(`Creating control file at ${dest}`)

  return await this.createTemplatedFile(src, dest)
}

DebianInstaller.prototype.createTemplatedFile = async function (templatePath, dest, filePermissions) {
  return template.createTemplatedFile(templatePath, dest, this.options, filePermissions)
}

// class DebianInstaller extends common.ElectronInstaller {
//   get contentFunctions () {
//     return [
//       'copyApplication',
//       'copyScripts',
//       'createControl',
//       // 'createCopyright',
//       'createOverrides'
//     ]
//   }
// 
//   defaultDesktopTemplatePath () {
//     return path.resolve(__dirname, '../resources/desktop.ejs')
//   }
// 
//   packagePattern () {
//     return path.join(this.stagingDir, '../*.deb')
//   }
// 
//   /**
//    * Copy the application into the package.
//    */
//   async copyApplication () {
//     await super.copyApplication(src => src !== path.join(this.options.src, 'LICENSE'))
//     return this.updateSandboxHelperPermissions()
//   }
// 
//   /**
//    * Generate the contents of the package in "parallel" by calling the methods specified in
//    * `contentFunctions` getter through `Promise.all`.
//    */
//   async createContents () {
//     debug('Creating contents of package')
// 
//     return error.wrapError('creating contents of package', async () => Promise.all(this.contentFunctions.map(func => this[func]())))
//   }
// 
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
// 
//   /**
//    * Package everything using `dpkg` and `fakeroot`.
//    */
//   async createPackage () {
//     this.options.logger(`Creating package at ${this.stagingDir}`)
// 
//     const output = await spawn('fakeroot', ['dpkg-deb', '--build', this.stagingDir], this.options.logger)
//     this.options.logger(`dpkg-deb output: ${output}`)
//     }
// 
//   /**
//    * Normalize the description by replacing all newlines in the description with spaces, since it's
//    * supposed to be one line.
//    */
//   normalizeDescription (description) {
//     return description.replace(/[\r\n]+/g, ' ')
//   }
// 
//   /**
//    * Ensure blank lines have the "." that denotes a blank line in the control file. Wrap any
//    * extended description lines to avoid lintian warnings about
//    * `extended-description-line-too-long`.
//    */
//   normalizeExtendedDescription (extendedDescription) {
//     return extendedDescription
//       .replace(/\r\n/g, '\n') // Fixes errors when finding blank lines in Windows
//       .replace(/^$/mg, '.')
//       .split('\n')
//       .map(line => wrap(line, { width: 80, indent: ' ' }))
//       .join('\n')
//   }
// 
//   /**
//    * Sanitize package name per Debian docs:
//    * https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-source
//    */
//   sanitizeName (name) {
//     const sanitized = common.sanitizeName(name.toLowerCase(), '-+.a-z0-9')
//     if (sanitized.length < 2) {
//       throw new Error('Package name must be at least two characters')
//     }
//     if (/^[^a-z0-9]/.test(sanitized)) {
//       throw new Error('Package name must start with an ASCII number or letter')
//     }
// 
//     return sanitized
//   }
// }

/* ************************************************************************** */

