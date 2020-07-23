# pkg-deb

Create a Debian package from an executable binary.

## Usage
`pkg-deb` requires a specific structure for your binary directory. For example:
```
.
└── project 
    ├── LICENSE
    ├── README.md
    ├── package.json
    └── dist 
        └── executable 
```

Your source directory must have a package.json for a properly generated
[`DEBIAN/control`](https://www.debian.org/doc/debian-policy/ch-controlfields.html) with the following fields:
* `name`  
* `author` - Debian only accepts a single author as part of its `maintainer`
  field
* `description`
* `homepage`

```js
const pkgDeb = require('pkg-deb')
const path = require('path')

const opts = {
  version: '0.0.1',
  name: 'executable',
  dest: path.join(__dirname, 'project', 'dist'),
  src: path.join(__dirname, 'project'), 
  input: path.join(__dirname, 'project', 'dist', 'executable'),
  arch: 'x64',
  logger: console.log
}

await pkgDeb(opts)
```

### API
#### await pkgDeb(opts)
Creates a Debian package in your `dest` directory. Under the hood `pkgDeb`
creates a `DEBIAN/control` file before creating a new package.

**Options:**
- **opts.version**: Version number of the package.
- **opts.name**: Name of the package.
- **opts.dest**: Destination where to write the final package. It will be saved
  as `name_version_arch.deb` in the provided `dest`.
- **opts.src**: Path to source directory. Must have a `package.json`.
- **opts.input**: Binary to be packaged.
- **opts.arch**: Architecture. You can specify: `x64`, `amd64`, `all`.
- **opts.logger**: Logger to help you debug. Defaults to `debug`.

## Contributors

* Irina Shestak ([shestak.irina@gmail.com](mailto:shestak.irina@gmail.com)) 
* Daniel Perez Alvarez ([unindented@gmail.com](mailto:unindented@gmail.com))

## License

Copyright (c) 2016 Daniel Perez Alvarez
([unindented.org](https://unindented.org/)). This is free software, and may be
redistributed under the terms specified in the LICENSE file.
