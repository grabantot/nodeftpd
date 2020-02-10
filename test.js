var ftpd = require('./');
var fs = require('fs');
var path = require('path');
var os = require('os');
var dns = require('dns');

var keyFile;
var certFile;
var server;
var options = {
  host: process.env.IP || '127.0.0.1',
  port: process.env.PORT || 7002,
  tls: null,
};
var rootDir = process.argv[2] || process.cwd();

if (process.env.KEY_FILE && process.env.CERT_FILE) {
  console.log('Running as FTPS server');
  if (process.env.KEY_FILE.charAt(0) !== '/') {
    keyFile = path.join(__dirname, process.env.KEY_FILE);
  }
  if (process.env.CERT_FILE.charAt(0) !== '/') {
    certFile = path.join(__dirname, process.env.CERT_FILE);
  }
  options.tls = {
    key: fs.readFileSync(keyFile),
    cert: fs.readFileSync(certFile),
    ca: !process.env.CA_FILES ? null : process.env.CA_FILES
      .split(':')
      .map(function(f) {
        return fs.readFileSync(f);
      }),
  };
} else {
  console.log();
  console.log('*** To run as FTPS server,                 ***');
  console.log('***  set "KEY_FILE", "CERT_FILE"           ***');
  console.log('***  and (optionally) "CA_FILES" env vars. ***');
  console.log();
}
console.log(`Root dir: '${rootDir}'`);

server = new ftpd.FtpServer(options.host, {
  getInitialCwd: function() {
    return '/';
  },
  getRoot: function() {
    return rootDir;
  },
  pasvPortRangeStart: 1025,
  pasvPortRangeEnd: 1050,
  tlsOptions: options.tls,
  allowUnauthorizedTls: true,
  useWriteFile: false,
  useReadFile: false,
  uploadMaxSlurpSize: 7000, // N/A unless 'useWriteFile' is true.
});

server.on('error', function(error) {
  console.log('FTP Server error:', error);
});

server.on('client:connected', function(connection) {
  var username = null;
  console.log('client connected: ' + connection.remoteAddress);
  connection.on('command:user', function(user, success, failure) {
    if (user) {
      username = user;
      success();
    } else {
      failure();
    }
  });

  connection.on('command:pass', function(pass, success, failure) {
    if (pass) {
      success(username);
    } else {
      failure();
    }
  });
});

server.debugging = 4;
server.listen(options.port);

var os = require('os');
var ifaces = os.networkInterfaces();

var ips = [];
Object.keys(ifaces).forEach(function (ifname) {
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      return; // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
    }
    ips.push(iface.address)
    console.log('Listening on ftp://' + iface.address + ':' + options.port);
  });
});


