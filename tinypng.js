#!/usr/bin/env node

require('colors');

const fs = require('fs');
const https = require('https');
const pjson = require('./package.json');

const options_path = `${__dirname}/settings.json`;
const files_io = [];

let options;
let files;
let file_count = 0;

/**
 * Get default options from settings file
 *
 * @returns {*}
 */
function getOptions() {
  const buffer = fs.readFileSync(options_path);
  options = JSON.parse(buffer.toString());

  return options;
}

/**
 * Set option whithout saving to settings file
 *
 * @param {string} param
 * @param {(string|boolean)} value
 */
function setLocalOption(param, value) {
  if (typeof param !== 'undefined' && typeof value !== 'undefined') {
    options[param] = value;
  }
}

/**
 * Set option with saving to settings file
 *
 * @param param
 * @param value
 */
function setOption(param, value) {
  if (typeof param !== 'undefined' && typeof value !== 'undefined') {
    setLocalOption(param, value);

    const write_data = JSON.stringify(options, null, 2);
    fs.writeFileSync(options_path, write_data);
  }
}

/**
 * Parse command-line arguments to options and files
 *
 * @returns {boolean}
 */
function parseArgvs() {
  let argvs = process.argv.slice(2);

  const checkArg = function() {
    if (argvs[0] && argvs[0][0] === '-') {
      switch (argvs[0]) {
        case '-k':
        case '--api-key':
          setOption('api_key', argvs[1]);
          argvs = argvs.slice(2);
          break;

        case '-r':
        case '--allow-rewrite':
          setLocalOption('allow_rewrite', true);
          argvs = argvs.slice(1);
          break;

        case '-n':
        case '--allow-nonpng':
          setLocalOption('allow_nonpng', true);
          argvs = argvs.slice(1);
          break;

        case '-h':
        case '--help':
          logHelp();
          exit();
          break;

        case '-v':
        case '--version':
          logVersion();
          exit();
          break;

        case '-p':
        case '--postfix':
          setLocalOption('postfix', argvs[1]);
          argvs = argvs.slice(2);
          break;

        default:
          files = argvs;
          break;
      }

      if (!files) {
        checkArg();
      }
    } else {
      files = argvs;
    }
  };

  if (argvs.length === 0) {
    argvs[0] = '--help';
  }

  checkArg();
  filterFiles();

  return true;
}

/**
 * Filter selected files from directories and wrong file extentions
 *
 * @returns {object}
 */
function filterFiles() {
  for (let i = 0, l = files.length; i < l; i++) {
    const file = files[i];
    if (fs.existsSync(file) && fs.statSync(file)
      .isFile()) {
      if ((!options.allow_nonpng && file.slice(-4) === '.png') || options.allow_nonpng) {
        const pair = [file, file];

        if (!options.allow_rewrite) {
          pair[1] = postfixedName(file);
        }

        files_io.push(pair);
      }
    }
  }

  return files_io;
}

/**
 * Adds postfix to filename
 *
 * @param {string} filename
 * @returns {string} postfixed filename
 */
function postfixedName(filename) {
  const arr = filename.split('.');

  if (arr.length === 1) {
    return `${filename}${options.postfix}`;
  }

  arr[arr.length - 2] = `${arr[arr.length - 2]}${options.postfix}`;
  return arr.join('.');
}

/**
 * Check API key and show warning
 *
 * @returns {boolean}
 */
function checkApiKey() {
  if (options.api_key === '') {
    logError('TinyPNG API key is empty. Get one from https://tinypng.com/developers, and set default key with --api-key.');
    exit(1);
  } else {
    return true;
  }
}

/**
 * Shows help message
 */
function logHelp() {
  const message = `
Usage: tinypng [options] [image.png|*.png]

${options.api_key === ''
  ? 'Warning! API key is not defined.'.yellow
  : `Current API key: ${options.api_key}`
}

Options:
  -k, --api-key      \tSet default TinyPNG API key.
  -r, --allow-rewrite\tRewrite the original files with compressed data.
  -n, --allow-nonpng \tAllow you to compress files without .png extention.
  -p, --postfix      \tPostfix for compressed files when rewriting disabled.
  -h, --help         \tThis message.
  -v, --version      \tShow version.
`;

  console.log(message);
}

/**
 * Shows version
 */
function logVersion() {
  console.log(pjson.version);
}

/**
 * Shows error message
 *
 * @param {*} message
 */
function logError(message) {
  console.error('>_<'.red, message);
}

/**
 * Shows log message
 *
 * @param {*} message
 */
function logMessage(message) {
  console.log('*Ü*'.green, message);
}

/**
 * Exit from application with code
 *
 * @param {number} [code=0]
 */
function exit(code) {
  if (!code) {
    code = 0;
  }

  process.exit(code);
}

/**
 * Compress and save image
 */
function makeTiny() {
  let pair = files_io[file_count];

  if (!pair) {
    return logMessage('Compression complete!');
  }

  const input = pair[0];
  const output = pair[1];

  process.stdout.write(`${input}${' → '.grey}`);

  const req_options = require('url').parse('https://api.tinypng.com/shrink');
  req_options.auth = `api:${options.api_key}`;
  req_options.method = 'POST';

  const request = https.request(req_options, function(res) {
    res.on('data', function(d) {
      d = JSON.parse(d);

      if (d.error) {
        process.stdout.write(`${'error'.red}\n`);
        logError(`${d.error}: ${d.message}`);
        exit(1);
      } else {
        process.stdout.write(`-${((1 - d.output.ratio) * 100).toFixed(1)}%${' → '.grey}`);
      }
    });

    if (res.statusCode === 201) {
      https.get(res.headers.location, function(res) {
        res.pipe(fs.createWriteStream(output));

        process.stdout.write(`${output.yellow}\n`);
        file_count++;
        makeTiny();
      });
    }
  });

  fs.createReadStream(input)
    .pipe(request);
}

/**
 * Initialize function
 */
function run() {
  getOptions();
  parseArgvs();
  checkApiKey();

  if (files_io.length > 0) {
    makeTiny();
  }
}

run();
