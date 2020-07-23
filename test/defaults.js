const getDefaultsFromPackageJSON = require('../src/defaults')
const expect = require('chai').expect

describe('getDefaultsFromPackageJSON', function () {
  it('returns default information with passed in variables', function () {
    const data = {
      name: 'nori-pkg',
      description: 'pkg for Nori-cat.',
      productDescription: 'A nice package for cat.',
      homepage: 'https://github.com/mongodb-js/pkg-deb'
    }

    const defaultData = {
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
      homepage: 'https://github.com/mongodb-js/pkg-deb',
      mimeType: [],
      name: 'nori-pkg',
      productDescription: 'A nice package for cat.',
      productName: 'nori-pkg',
      revision: undefined
    }

    expect(getDefaultsFromPackageJSON(data)).to.deep.equal(defaultData)
  })

  it('returns undefined defaults if no data is passed', function () {
    const undefinedData = {
      arch: undefined,
      bin: undefined,
      execArguments: [],
      categories: [
        'GNOME',
        'GTK',
        'Utility'
      ],
      description: undefined,
      genericName: undefined,
      homepage: '',
      mimeType: [],
      name: undefined,
      productDescription: undefined,
      productName: undefined,
      revision: undefined
    }

    expect(getDefaultsFromPackageJSON({})).to.deep.equal(undefinedData)
  })

  it('returns description if no product description is provided', function () {
    const data = {
      name: 'nori-pkg',
      description: 'pkg for Nori-cat.',
      homepage: 'https://github.com/mongodb-js/pkg-deb'
    }

    const defaultData = {
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
      homepage: 'https://github.com/mongodb-js/pkg-deb',
      mimeType: [],
      name: 'nori-pkg',
      productDescription: 'pkg for Nori-cat.',
      productName: 'nori-pkg',
      revision: undefined
    }

    expect(getDefaultsFromPackageJSON(data)).to.deep.equal(defaultData)
  })

  it('uses genericName when provided', function () {
    const data = {
      name: 'nori-pkg',
      genericName: 'pkg',
      description: 'pkg for Nori-cat.',
      homepage: 'https://github.com/mongodb-js/pkg-deb'
    }

    const defaultData = {
      arch: undefined,
      bin: 'nori-pkg',
      execArguments: [],
      categories: [
        'GNOME',
        'GTK',
        'Utility'
      ],
      description: 'pkg for Nori-cat.',
      genericName: 'pkg',
      homepage: 'https://github.com/mongodb-js/pkg-deb',
      mimeType: [],
      name: 'nori-pkg',
      productDescription: 'pkg for Nori-cat.',
      productName: 'nori-pkg',
      revision: undefined
    }

    expect(getDefaultsFromPackageJSON(data)).to.deep.equal(defaultData)
  })
})
