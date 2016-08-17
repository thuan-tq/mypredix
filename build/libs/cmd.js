/**
 * author: Anh V. Nguyen (anhnv16@fsoft.com.vn)
 *
 * I made a little change from Chia's code to leverage it as a library to run command line
 *
 */

var _shell = require('shelljs');
var _log = require('./logger');

exports.run = function (cmd, options) {
  options = options || {};
  return new Promise(function (reso, reje) {
    !options.shhh && _log.info('$ ' + cmd);
    _shell.exec(cmd, function (code, stdout, stderr) {
      stderr = '$ ' +  cmd + '\n' + stderr;
      return (code === 0 || options.allowFailure) ? reso({stdout: stdout, code: code}) : reje(stderr);
    });
  });
};