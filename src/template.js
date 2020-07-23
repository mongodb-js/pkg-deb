const template = require('lodash.template')
const fs = require('fs-extra')
const path = require('path')

/**
 * Create a file from a template. Any necessary directories are automatically created.
 */
module.exports = async function createTemplatedFile (templatePath, dest, options) {
  await fs.ensureDir(path.dirname(dest), '0755')
  const data = await generateTemplate(templatePath, options)
  return fs.outputFile(dest, data)
}

/**
 * Fill in a template with the hash of data.
 */
async function generateTemplate (file, data) {
  const result = template(await fs.readFile(file))(data)
  return result
}
