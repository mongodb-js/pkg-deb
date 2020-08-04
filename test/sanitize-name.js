const sanitizeName = require('../src/sanitize-name')
const expect = require('chai').expect

describe('sanitizeName', function () {
  it('sanitizes scoped package name', function () {
    const name = '@cats/nori'
    expect(sanitizeName(name)).to.equal('cats-nori')
  })

  it('throws if package name is less than 2', function () {
    const name = 'a'
    try {
      sanitizeName(name)
    } catch (e) {
      expect(e.message).to.be.equal('Package name must be at least two characters')
    }
  })
  it('throws if package name starts with ASCII charachter', function () {
    const name = '~cats/chashu'
    try {
      sanitizeName(name)
    } catch (e) {
      expect(e.message).to.be.equal('Package name must start with an ASCII number or letter')
    }
  })
})
