/**
 * Sanitize package name per Debian docs:
 * https://www.debian.org/doc/debian-policy/ch-controlfields.html#s-f-source
 */
module.exports = function sanitizeName (name) {
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
  return name.replace(/^@/, '').replace('/', divider)
}
