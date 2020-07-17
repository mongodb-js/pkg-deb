const fs = require('fs-extra')
const path = require('path')

/**
 * Read `package.json` either from `$RESOURCES_DIR/app.asar` (if the app is packaged)
 * or from `$RESOURCES_DIR/app/package.json` (if it is not). `$RESOURCES_DIR` is either
 * `AppName.app/Contents/Resources` on macOS, or `resources` on other platforms.
 *
 * Options used:
 *
 * * `src`: the directory containing the bundled app
 * * `logger`: function that handles debug messages, e.g.,
 *             `debug('electron-installer-something:some-module')`
 */
module.exports = async function readMetadata (options) {
  const appPackageJSONPath = path.join(options.sourceDir, '..', '..', 'package.json')
  console.log(`Reading package metadata from ${appPackageJSONPath}`)
  return fs.readJson(appPackageJSONPath)
    .catch( function (err) {
      throw new Error(`Could not find, read, or parse package.json '${options.sourceDir}':\n${err.message}`)
    })
}
