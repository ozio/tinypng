//#!/usr/bin/env node
'usr strick';

var fs = require('fs'),
    https = require('https'),
    colors = require('colors'),
    pjson = require('./package.json');
var path = require("path");
var glob = require("glob");

var options, 
  options_path = __dirname + '/settings.json', 
  files, 
  files_io = [], 
  file_count = 0,
  file_success = 0,
  regPng = /\.png/i,
  regAll = /\.jpg|\.jpeg|\.png/i;

/**
 * Get default options from settings file
 *
 * @returns {*}
 */
var getOptions = function() {
  var buffer = fs.readFileSync(options_path);
  options = JSON.parse(buffer.toString());
  return options;
};

/**
 * Set option whithout saving to settings file
 *
 * @param {string} param
 * @param {(string|boolean)} value
 */
var setLocalOption = function(param, value) {
  if(typeof param !== 'undefined' && typeof value !== 'undefined') {
    options[param] = value;
  }
};

/**
 * Set option with saving to settings file
 *
 * @param param
 * @param value
 */
var setOption = function(param, value) {
  if(typeof param !== 'undefined' && typeof value !== 'undefined') {
    setLocalOption(param, value);

    var write_data = JSON.stringify(options, null, 2);
    fs.writeFileSync(options_path, write_data);
  }
};

/**
 * Parse command-line arguments to options and files
 *
 * @returns {boolean}
 */
var parseArgvs = function() {
  var argvs = process.argv.slice(2);

  var checkArg = function() {
    if(argvs[0] && argvs[0][0] === '-') {
      switch(argvs[0]) {
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
      if(!files) {
        checkArg();
      }
    } else {
      files = argvs;
    }
  };

  if(argvs.length === 0) {
    argvs[0] = '--help';
  }

  checkArg();
  var srcs = [];
  files.forEach(function (item) {
    srcs = srcs.concat(glob.sync(item));
  });
  files = srcs;
  console.log(files)
  filterFiles(files);

  return true;
};

/**
 * Filter selected files from directories and wrong file extentions
 * @param {Array} files
 * @returns {Array}
 */

var filterFiles = function(files) {
  for(var i = 0, l = files.length; i < l; i++) {
    
    var file = path.resolve(files[i] || "");
    if(fs.existsSync(file)) {
      if(fs.statSync(file).isFile()){
        if ((!options.allow_nonpng && file.match(regPng) ) || (options.allow_nonpng && file.match(regAll))) {
          var pair = [ file, file ];
  
          if(!options.allow_rewrite) {
            pair[1] = postfixedName(file);
          }
  
          files_io.push(pair);
        }
      }
      else if(fs.statSync(file).isDirectory()){
        var items = fs.readdirSync(file);
        var dir=[];
        for(var i=0,len=items.length;i<len;i++){
          dir.push(path.join(file, items[i]))
        }
        filterFiles(dir);
      }
    }
  }

  return files_io;
};

/**
 * Adds postfix to filename
 *
 * @param {string} filename
 * @returns {string} postfixed filename
 */
var postfixedName = function(filename) {
  var arr = filename.split('.');

  if(arr.length === 1) {
    return filename + options.postfix;
  } else {
    arr[arr.length-2] = arr[arr.length-2] + options.postfix;
    return arr.join('.');
  }
};

/**
 * Check API key and show warning
 *
 * @returns {boolean}
 */
var checkApiKey = function() {
  if(options.api_key === "") {
    logError("TinyPNG API key is empty. Get one from https://tinypng.com/developers, and set default key with --api-key.");
    exit(1);
  } else {
    return true;
  }
};

/**
 * Shows help message
 */
var logHelp = function() {
  var message =
      "\n" +
      "Usage: tinypng [options] [image.png|*.png]\n" +
      "\n" +
      ( options.api_key === "" ? "Warning! API key is not defined.".yellow : "Current API key: " + options.api_key ) + "\n" +
      "\n" +
      "Options:\n" +
      "  -k, --api-key\t\tSet default TinyPNG API key.\n" +
      "  -r, --allow-rewrite\tRewrite the original files with compressed data.\n" +
      "  -n, --allow-nonpng \tAllow you to compress files without .png extention.\n" +
      "  -p, --postfix\t\tPostfix for compressed files when rewriting disabled.\n" +
      "  -h, --help\t\tThis message.\n" +
      "  -v, --version\t\tShow version." +
      "\n";

  console.log(message);
};

/**
 * Shows version
 */
var logVersion = function() {
  console.log(pjson.version);
};

/**
 * Shows error message
 *
 * @param {*} message
 */
var logError = function(message) {
  console.error('>_<'.red, message.red);
};

/**
 * Shows log message
 *
 * @param {*} message
 */
var logMessage = function(message) {
  console.log('*Ü*'.green, message.green);
};

/**
 * Exit from application with code
 *
 * @param {number} [code=0]
 */
var exit = function(code) {
  if(!code) {
    code = 0;
  }
  process.exit(code);
};

/**
 * Compress and save image
 * @param {number} offset
 * @returns {*}
 */
var makeTiny = function(offset) {
  var pair = files_io[offset];
  
//  if(!pair) {
//    return logMessage('Compression complete!');
//  }

  var input = pair[0];
  var output = pair[1];

//  process.stdout.write(input + " → ".grey);

  var req_options = require("url").parse("https://api.tinypng.com/shrink");
  req_options.auth = "api:" + options.api_key;
  req_options.method = "POST";

  var request = https.request(req_options, function(res) {

    res.on('data', function(d) {
      d = JSON.parse(d);
      if(d.error) {
        process.stdout.write("error".red + "\n");
        logError(input + " → ".grey+d.error + ": " + d.message);
        file_count++;
        if(file_count==files_io.length) {
          logMessage('Total '+file_count+'files, '+file_success+' files success.');
        }
        //exit(1);
      } else {
//        process.stdout.write("-" + ((1 - d.output.ratio) * 100).toFixed(1) + "%" + " → ".grey);
      }
    });

    if (res.statusCode === 201) {
      https.get(res.headers.location, function(res) {
        
        res.pipe(fs.createWriteStream(output));

        process.stdout.write(output.yellow + " success".green + "\n");
        file_count++;
        file_success++;
        if(file_count==files_io.length) {
          logMessage('Total '+file_count+'files, '+file_success+' files success.');
        }
      });
    }

  });
  
  fs.createReadStream(input).pipe(request);
};

/**
 * Initialize function
 *
 */
var run = function() {
  getOptions();
  parseArgvs();
  checkApiKey();
  if(files_io.length > 0) {
    logMessage("start waiting··· " );
    for(var i=0,len=files_io.length;i<len;i++){
      makeTiny(i);
      
    }
  }
  else {
    logError("File not found.");
  }
  
  //if(files_io.length > 0) {
  //  makeTiny();
  //}
};

run();
