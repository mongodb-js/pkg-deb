const expect = require('chai').expect
const fs = require('fs-extra')
const packager = require('..')
const path = require('path')

const PackageDebian = packager.PackageDebian

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

  context('PackageDebian.prototype', function () {
    let pkgDebian

    before(() => {
      const opts = {
        version: '0.0.1',
        name: 'lilbins',
        dest: dest,
        src: src,
        input: input,
        arch: 'x64'
      }

      pkgDebian = new PackageDebian(opts)
    })

    it('creates an instance of PackageDebian', async function () {
      expect(pkgDebian).to.be.an.instanceOf(PackageDebian)
      expect(pkgDebian.version).to.equal('0.0.1')
      expect(pkgDebian.input).to.equal(input)
      expect(pkgDebian.arch).to.equal('x64')
      expect(pkgDebian.name).to.equal('lilbins')
      expect(pkgDebian.dest).to.equal(dest)
      expect(pkgDebian.src).to.equal(src)
      expect(pkgDebian.packageName).to.equal('lilbins_0.0.1_x64')
    })

    it('PackageDebian.prototype.generateDefaults', async function () {
      const options = await pkgDebian.generateDefaults()
      const expectedOptions = {
        arch: 'x64',
        bin: 'example-pkg-deb',
        categories: [
          'GNOME',
          'GTK',
          'Utility'
        ],
        depends: [],
        description: 'An example directory structure to work with pkg-deb',
        enhances: [],
        execArguments: [],
        genericName: 'example-pkg-deb',
        homepage: '',
        lintianOverrides: [],
        maintainer: 'Compass Team <compass@mongodb.com>',
        mimeType: [],
        name: 'example-pkg-deb',
        preDepends: [],
        priority: 'optional',
        productDescription: ' An example directory structure to work with pkg-deb',
        productName: 'example-pkg-deb',
        recommends: [],
        revision: undefined,
        section: 'utils',
        size: 1,
        suggests: [],
        version: '0.0.1'
      }
      expect(options).to.be.deep.equal(expectedOptions)
    })

    it('PackageDebian.prototype.createStagingDir', async function () {
      await pkgDebian.createStagingDir()
      const doesExist = await fs.pathExists(pkgDebian.stagingDir)
      // eslint-disable-next-line
      expect(doesExist).to.be.true
    })

    it('PackageDebian.prototype.copyApplication', async function () {
      await pkgDebian.createStagingDir()
      await pkgDebian.copyApplication()
      const doesExist = await fs.pathExists(path.join(pkgDebian.stagingDir, pkgDebian.name))
      // eslint-disable-next-line
      expect(doesExist).to.be.true
    })

    it('PackageDebian.prototype.createControl', async function () {
      await pkgDebian.createStagingDir()
      await pkgDebian.createControl()
      const doesExist = await fs.pathExists(path.join(pkgDebian.stagingDir, 'DEBIAN/control'))
      // eslint-disable-next-line
      expect(doesExist).to.be.true
    })

    it('PackageDebian.prototype.createPackage', async function () {
      await pkgDebian.createStagingDir()
      await pkgDebian.createControl()
      await pkgDebian.createPackage()
      const doesExist = await fs.pathExists(path.join(pkgDebian.dir.path, pkgDebian.packageName))
      // eslint-disable-next-line
      expect(doesExist).to.be.true
    })
  })
})
