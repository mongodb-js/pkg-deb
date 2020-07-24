const expect = require('chai').expect
const fs = require('fs-extra')
const packager = require('..')
const path = require('path')

const input = path.join(__dirname, 'fixtures', 'lilbins')
const dest = path.join(__dirname, 'fixtures', 'dist')
const src = path.join(__dirname, 'fixtures')
const output = path.join(dest, 'lilbins_0.0.1_x64.deb')

describe('Packager', function () {
  this.timeout(30000)

  after(function () {
    fs.remove(output)
  })

  context('Packager default export', function () {
    it('writes debian package to destination directory', async function () {
      const opts = {
        version: '0.0.1',
        name: 'lilbins',
        dest: dest,
        src: src,
        input: input,
        arch: 'x64'
      }

      await packager(opts)

      let accessErr
      try {
        await fs.access(output)
      } catch (e) {
        accessErr = e
      }
      // eslint-disable-next-line
      expect(accessErr).to.be.undefined
    })

    it('fails if input is not a string', async function () {
      const opts = {
        version: '0.0.1',
        name: 'lilbins',
        dest: dest,
        src: src,
        input: 25,
        arch: 'x64'
      }

      try {
        await packager(opts)
      } catch (e) {
        // different node versions have a different name for this, so just test
        // with .include
        expect(e.name).to.be.include('TypeError')
      }
    })

    describe('with restrictive umask', test => {
      let defaultMask
      let consoleWarn
      let warning = ''

      before(() => {
        defaultMask = process.umask(0o777)
        consoleWarn = console.warn
        console.warn = msg => {
          warning += msg
        }
      })

      it('warns the user about umasks', () => {
        const opts = {
          version: '0.0.1',
          name: 'lilbins',
          dest: dest,
          src: src,
          input: input,
          arch: 'x64'
        }

        return packager(opts)
          .catch(() => expect(warning).to.contain(`The current umask, ${process.umask().toString(8)}, is not supported. You should use 0022 or 0002`))
      })

      after(() => {
        console.warn = consoleWarn
        process.umask(defaultMask)
      })
    })
  })
})
