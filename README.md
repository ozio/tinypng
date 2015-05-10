# TinyPNG

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url]

Compress PNG with TinyPNG API in terminal.

## Installation

    $ npm install -g node-tinypng


## Usage

```
Usage: tinypng [options] [image.png|*.png]

  -k, --api-key       Set default TinyPNG API key.
  -r, --allow-rewrite Rewrite the original files with compressed data.
  -n, --allow-nonpng  Allow you to compress files without .png extention.
  -p, --postfix       Postfix for compressed files when rewriting disabled.
  -h, --help          This message.
  -v, --version       Show version.
```

## License

MIT © [Nikolay Solovyov](http://ozio.io)

[downloads-image]: http://img.shields.io/npm/dm/node-tinypng.svg
[npm-url]: https://npmjs.org/package/node-tinypng
[npm-image]: http://img.shields.io/npm/v/node-tinypng.svg
