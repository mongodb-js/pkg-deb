const _ = require('lodash')
const debug = require('debug')('debian-installer:template')
const fs = require('fs-extra')
const path = require('path')

/**
 * Fill in a template with the hash of data.
 */
async function generateTemplate (file, data) {
  debug(`Generating template from ${file}`)

  const result = _.template(await fs.readFile(file))(data)
  debug(`Generated template from ${file}\n${result}`)
  return result
}

module.exports = {
  /**
   * Create a file from a template. Any necessary directories are automatically created.
   */
  createTemplatedFile: async function createTemplatedFile (templatePath, dest, options, filePermissions) {
    const fileOptions = {}
    if (filePermissions) {
      fileOptions.mode = filePermissions
    }
    await fs.ensureDir(path.dirname(dest), '0755')
    const data = await generateTemplate(templatePath, options)
    return fs.outputFile(dest, data, fileOptions)
  },
  generateTemplate
}