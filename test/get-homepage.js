const getHomepage = require('../src/get-homepage')
const expect = require('chai').expect

describe('getHomepage', function () {
  it('returns homepage when homepage is provided', function () {
    const data = { homepage: 'github.com/mongodb-js/pkg-deb' }
    expect(getHomepage(data)).to.equal(data.homepage)
  })

  it('returns author url when author url string is provided', function () {
    const data = { author: 'Irina Shestak <shestak.irina@gmail.com> (nom.lrlna.computer)' }
    expect(getHomepage(data)).to.equal('nom.lrlna.computer')
  })

  it('returns empty when author string is provided with no url', function () {
    const data = { author: 'Irina Shestak <shestak.irina@gmail.com>' }
    expect(getHomepage(data)).to.equal('')
  })

  it('returns author url when author url object is provided', function () {
    const data = {
      author: {
        name: 'Irina Shestak',
        email: 'shestak.irina@gmail.com',
        url: 'nom.lrlna.computer'
      }
    }
    expect(getHomepage(data)).to.equal('nom.lrlna.computer')
  })

  it('returns empty string when no url info is provided', function () {
    const data = {}
    expect(getHomepage(data)).to.equal('')
  })
})
