const getMaintainer = require('../src/get-maintainer')
const expect = require('chai').expect

describe('getMaintainer', function () {
  it('returns maintainer string without url if author string is provided', function () {
    const author = 'Irina Shestak <shestak.irina@gmail.com> (nom.lrlna.computer)'
    expect(getMaintainer(author)).to.equal('Irina Shestak <shestak.irina@gmail.com>')
  })

  it('returns maintainer string without url if author object is provided', function () {
    const author = {
      name: 'Irina Shestak',
      email: 'shestak.irina@gmail.com',
      url: 'nom.lrlna.computer'
    }
    expect(getMaintainer(author)).to.equal('Irina Shestak <shestak.irina@gmail.com>')
  })

  it('returns maintainer string if no email is provided', function () {
    const author = {
      name: 'Irina Shestak'
    }
    expect(getMaintainer(author)).to.equal('Irina Shestak')
  })

  it('returns undefined when no author is provided', function () {
    const author = undefined
    expect(getMaintainer(author)).to.equal(undefined)
  })
})
