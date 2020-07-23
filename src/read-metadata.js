const fs = require('fs-extra')
const path = require('path')

/**
 * Find and read package.json from src dir to construct metadata necessary for
 * control file.
 *
 * Options used:
 *
 * * `src`: the directory containing the bundled app
 * * `logger`: function that handles debug messages
 */
module.exports = async function readMetadata (options) {
  const appPackageJSONPath = path.join(options.src, 'package.json')
  options.logger(`Reading package metadata from ${appPackageJSONPath}`)
  return fs.readJson(appPackageJSONPath)
    .catch( function (err) {
      throw new Error(`Could not find, read, or parse package.json '${options.src}':\n${err.message}`)
    })
}
