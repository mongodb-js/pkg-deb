const createTemplatedFile = require('../src/template')
const expect = require('chai').expect
const fs = require('fs-extra')
const path = require('path')

describe('createTemplatedFile', function () {
  const dest = path.join(__dirname, 'fixtures', 'dist', 'template')
  const templatePath = path.join(__dirname, '../resources/control.ejs')

  afterEach(function () {
    fs.remove(dest)
  })

  it('writes template file', async function () {
    const data = {
      arch: undefined,
      bin: 'nori-pkg',
      execArguments: [],
      categories: [
        'GNOME',
        'GTK',
        'Utility'
      ],
      description: 'pkg for Nori-cat.',
      genericName: 'nori-pkg',
      version: '1.0.0',
      section: 'utils',
      priority: 'optional',
      size: '12.4',
      homepage: 'https://github.com/mongodb-js/pkg-deb',
      mimeType: [],
      depends: [],
      recommends: [],
      suggests: [],
      enhances: [],
      preDepends: [],
      lintianOverrides: [],
      maintainer: 'Irina Shestak <shestak.irina@gmail.com>',
      name: 'nori-pkg',
      productDescription: 'A nice package for cat.',
      productName: 'nori-pkg',
      revision: undefined
    }

    await createTemplatedFile(templatePath, dest, data)
    expect(await fs.ensureFile.bind(fs.ensureFile, dest)).to.not.throw()
  })

  it('it throws when an option is missing', async function () {
    const data = {
      arch: undefined,
      bin: 'nori-pkg',
      execArguments: [],
      categories: [
        'GNOME',
        'GTK',
        'Utility'
      ],
      description: 'pkg for Nori-cat.',
      genericName: 'nori-pkg',
      version: '1.0.0',
      section: 'utils',
      priority: 'optional',
      size: '12.4',
      homepage: 'https://github.com/mongodb-js/pkg-deb',
      mimeType: [],
      depends: [],
      recommends: [],
      suggests: [],
      enhances: [],
      preDepends: [],
      lintianOverrides: [],
      name: 'nori-pkg',
      productDescription: 'A nice package for cat.',
      productName: 'nori-pkg',
      revision: undefined
    }

    try {
      await createTemplatedFile(templatePath, dest, data)
    } catch (e) {
      expect(e.name).to.be.equal('ReferenceError')
    }
  })

  it('written template file includes correct information', async function () {
    const data = {
      arch: 'x64',
      bin: 'nori-pkg',
      execArguments: [],
      categories: [
        'GNOME',
        'GTK',
        'Utility'
      ],
      description: 'pkg for Nori-cat.',
      genericName: 'nori-pkg',
      version: '1.0.0',
      section: 'utils',
      priority: 'optional',
      size: '12.4',
      homepage: 'https://github.com/mongodb-js/pkg-deb',
      mimeType: [],
      depends: [],
      recommends: [],
      suggests: [],
      enhances: [],
      preDepends: [],
      lintianOverrides: [],
      maintainer: 'Irina Shestak <shestak.irina@gmail.com>',
      name: 'nori-pkg',
      productDescription: 'A nice package for cat.',
      productName: 'nori-pkg',
      revision: undefined
    }

    const expectedTemplate = 'Package: nori-pkg\nVersion: 1.0.0\nSection: utils\nPriority: optional\nArchitecture: x64\nInstalled-Size: 12.4\nMaintainer: Irina Shestak <shestak.irina@gmail.com>\nHomepage: https://github.com/mongodb-js/pkg-deb\nDescription: pkg for Nori-cat.\nA nice package for cat.'

    await createTemplatedFile(templatePath, dest, data)
    const template = await fs.readFile(dest, 'utf8')
    expect(template).to.include(expectedTemplate)
  })
})
