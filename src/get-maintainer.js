const parseAuthor = require('parse-author')

/**
 * Generates a Debian-compliant maintainer value from a package.json author field.
 */
module.exports = function getMaintainer (author) {
  if (author) {
    if (typeof author === 'string') {
      author = parseAuthor(author)
    }
    const maintainer = [author.name]
    if (author.email) {
      maintainer.push(`<${author.email}>`)
    }

    return maintainer.join(' ')
  }
}
