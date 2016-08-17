/**
 * author: Anh V. Nguyen (anhnv16@fsoft.com.vn)
 *
 * Logger utils with colors
 */

require('colors');

module.exports = {
  info: function (msg) {
    console.log(('[INFO] ' + msg));
  },
  ok: function (msg) {
    console.log(('[OK] ' + msg).green);
  },
  error: function (msg) {
    console.error(('[ERROR] ' + msg).red);
  },
  warn: function (msg) {
    console.log(('[WARN] ' + msg).yellow);
  }
};