const pkgDeb = require('../')
const path = require('path')

const opts = {
  version: '0.0.1',
  name: 'lilbins',
  dest: path.join(__dirname, 'dist'),
  src: path.join(__dirname),
  input: path.join(__dirname, 'lilbins'),
  arch: 'amd64',
  logger: console.log
}

pkgDeb(opts).catch(e => console.log(e))
