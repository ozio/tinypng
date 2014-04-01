#!/usr/bin/env node

var fs = require('fs'),
    https = require('https'),
    colors = require('colors');

var options, options_path = __dirname + '/settings.json', files, files_io = [], file_count = 0;

var getOptions = function() {
  var buffer = fs.readFileSync(options_path);
  options = JSON.parse(buffer.toString());
};

var setLocalOption = function(param, value) {
  if(typeof param !== 'undefined' && typeof value !== 'undefined') {
    options[param] = value;
  }
};

var setOption = function(param, value) {
  if(typeof param !== 'undefined' && typeof value !== 'undefined') {
    setLocalOption(param, value);

    var write_data = JSON.stringify(options, null, 2);
    fs.writeFileSync(options_path, write_data);
  }
};

var parseArgvs = function() {
  // --api-key, -k
  // --allow-rewrite, -r
  // --allow-nonpng, -n
  // --postfix, -p
  // --help, -h

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
  filterFiles();
};

var filterFiles = function() {
  for(var i = 0, l = files.length; i < l; i++) {
    var file = files[i];
    if(fs.existsSync(file) && fs.statSync(file).isFile()) {
      if ((!options.allow_nonpng && file.slice(-4) === '.png' ) || options.allow_nonpng) {
        var pair = [ file, file ];

        if(!options.allow_rewrite) {
          pair[1] = postfixedName(file);
        }

        files_io.push(pair);
      }
    }
  }
};

var postfixedName = function(file) {
  var arr = file.split('.');

  if(arr.length === 1) {
    return file + options.postfix;
  } else {
    arr[arr.length-2] = arr[arr.length-2] + options.postfix;
    return arr.join('.');
  }
};

var checkApiKey = function() {
  if(options.api_key === "") {
    logError("TinyPNG API key is empty. Get one from https://tinypng.com/developers, and set default key with --api-key.");
    exit(1);
  } else {
    return true;
  }
};

var logHelp = function() {
  console.log(
      "\n" +
      "Usage: tinypng [options] [image.png|*.png]\n" +
      "\n" +
      ( options.api_key === "" ? "Warning! API key is not defined.".yellow : "Current API key: " + options.api_key ) + "\n" +
      "\n" +
      "Options:\n" +
      "  --api-key, -k      \tSet default TinyPNG API key.\n" +
      "  --allow-rewrite, -r\tRewrite the original files with compressed data.\n" +
      "  --allow-nonpng, -n \tAllow you to compress files without .png extention.\n" +
      "  --postfix, -p      \tPostfix for compressed files when rewriting disabled.\n" +
      "  --help, -h         \tThis message." +
      "\n"
  );
};

var logError = function(message) {
  console.error('>_<'.red, message);
};

var logMessage = function(message) {
  console.log('*Ü*'.green, message);
};

var exit = function(code) {
  if(!code) {
    code = 0;
  }
  process.exit(code);
};

var makeTiny = function() {
  var pair = files_io[file_count];

  if(!pair) {
    return logMessage('Compression complete!');
  }

  var input = pair[0];
  var output = pair[1];

  process.stdout.write(input + " → ".grey);

  var req_options = require("url").parse("https://api.tinypng.com/shrink");
  req_options.auth = "api:" + options.api_key;
  req_options.method = "POST";

  var request = https.request(req_options, function(res) {

    res.on('data', function(d) {
      d = JSON.parse(d);

      if(d.error) {
        process.stdout.write("error".red + "\n");
        logError(d.error + ": " + d.message);
        exit(1);
      } else {
        process.stdout.write("-" + ((1 - d.output.ratio) * 100).toFixed(1) + "%" + " → ".grey);
      }
    });

    if (res.statusCode === 201) {
      https.get(res.headers.location, function(res) {
        res.pipe(fs.createWriteStream(output));

        process.stdout.write(output.yellow + "\n");
        file_count++;
        makeTiny();
      });
    }

  });

  fs.createReadStream(input).pipe(request);
};

var run = function() {
  getOptions();
  parseArgvs();
  checkApiKey();

  if(files_io.length > 0) {
    makeTiny();
  }
};

run();
