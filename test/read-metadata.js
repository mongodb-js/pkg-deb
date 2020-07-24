const readMetadata = require('../src/read-metadata')
const expect = require('chai').expect
const path = require('path')

describe('readMetadata', function () {
  it('returns package json object', async function () {
    const options = {
      src: path.join(__dirname, 'fixtures'),
      logger: console.log
    }
    const metadata = await readMetadata(options)

    expect(metadata.name).to.equal('example-pkg-deb')
    expect(metadata.description).to.equal('An example directory structure to work with pkg-deb')
    expect(metadata.version).to.equal('0.0.1')
    expect(metadata.author).to.equal('Compass Team <compass@mongodb.com>')
    expect(metadata.main).to.equal('src/index.js')
  })

  it('throws when package.json does not exist', async function () {
    const options = {
      src: path.join(__dirname, 'fixtures', 'dist'),
      logger: console.log
    }
    try {
      await readMetadata(options)
    } catch (e) {
      expect(e.message).to.include('Could not find, read, or parse package.json')
    }
  })
})
