/**
 * author: Anh V. Nguyen (anhnv16@fsoft.com.vn)
 *
 * This is the main part of the scripts, this script will interact with cf, uaac via shell to:
 * - Build backend and frontend code
 * - Clean up environment
 * - Login to CloudFoundry
 * - Start a dummy app (just a small peace of nodejs code).
 * - Create independent services such as predix-uaa, postgres, redis, rabbitmq with isolated env and bind these services to the dummy app
 * - Read the uaa's issuerId from VCAP_SERVICES of the dummy app
 * - Create the services (predix-views, predix-timeseries, predix-acs) which have uaa as the dependency with the trustedIssuerId is the issuerId has been read above and bind these services to the dummy app.
 * - Automatically configure uaa for creating user, client, group, zone, member for predix-views, predix-timeseries, predix-acs
 * - Bind services to applications.
 * - Setup the environment variables for applications.
 * - Generate the manifest.yml file, the generated file name will be in this format: generated.manifest.{env}.yml.
 * - Push apps
 */

var _cmd = require('./cmd'),
  _yml = require('js-yaml'),
  _fs = require('fs'),
  _log = require('./logger'),
  _requert = require('request')
  ;

module.exports = function (options) {
  var self = this;
  this.options = options || {};
  this.dummyAppName = 'dummy-app-' + options.env;
  this.appConfigFilePath =  this.options.appsConfigPath + '.json'
  // cloning arrays instead of set ref
  this.appConfig = this.options.appConfig;
  this.appConfigTemplate = this.options.appConfigTemplate;
  



  this._parseVcap = function (_, appName) {
    appName = appName || self.dummyAppName;
    _log.ok('Parsing VCAP for app <a> ...'.replace('<a>', appName));
    return new Promise(function (resolve, reject) {
      _cmd.run('cf e ' + (appName))
        .then(function (data) {
          data = data.stdout.replace(/\n/g, '').replace(/ /g, '');
          if (appName === self.dummyAppName) {
            self.options.vcapServices = JSON.parse(data.split('{"VCAP_SERVICES":')[1].split('}{"VCAP_APPLICATION":')[0]);
          }
        })
        .then(resolve)
        .catch(reject);
    });
  };

  this._parseParameter = function (parameter, prefix) {

    if(parameter == '{redis-?}') { //adhoc processing for redis reference
      for(k in options.vcapServices) {
        if (k && k.indexOf('redis') >= 0) {
          return k;
        }
      }
    } else {
      prefix = prefix || 'options.';
      _log.ok('Parsing <p> with prefix <px> ...'.replace('<p>', parameter).replace('<px>', prefix));
      var values = parameter.match(/^.*\{(.*)\}.*$/);
      return values && values.length > 1 ? eval(prefix + values[1]) : parameter;
  }
  };


  this._parameters = function () {
    _log.ok('Parsing parameters in config-template.json and write it to config.json');
    return new Promise(function (resolve, reject) { 
      try{
       for(k in self.appConfigTemplate) {
        if (typeof self.appConfigTemplate[k] == 'string') {
         if (self.appConfigTemplate[k].indexOf('{') >=0) {
          self.appConfig[k] = self._parseParameter(self.appConfigTemplate[k]);
        } else {
          self.appConfig[k] = self.appConfigTemplate[k];
        }
       } else {
          self.appConfig[k] = self.appConfigTemplate[k];
       }
      }

      self._getClientToken()
        .then( function(token) {
           self.appConfig['token'] = token;
           _log.ok("Update the config file " + self.appConfigFilePath);

            configStr = JSON.stringify(self.appConfig, null, 2).replace('{','').replace('}','').replace(/"/g,'').replace(/,/g,'');

          _fs.writeFile("./configs/postman-config-" + options.env +".txt", configStr, function (err) {
                  return err ? reject(err) : resolve();
            });

          })
        .catch(reject);
     
    } catch(e) {
      reject(e);
    }
   });
  };

 


  this._getClientToken = function () {
    return new Promise(function (resolve, reject) {
      var uaaUri = self.options.vcapServices['predix-uaa'][0].credentials.uri + '/oauth/token';
      var headers = {
        'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
        'accept': 'application/json;charset=utf-8',
        'authorization': 'Basic ' + self.options.uaaClientBase64Token
      };
      var form = {
        grant_type: 'client_credentials'
      };
      var options = {
        url: uaaUri,
        headers: headers,
        form: form
      };
      _requert.post(options, function (err, res, body) {
        if (err) return reject(err);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          token = JSON.parse(body).access_token;
          return resolve(token);
        }
        return reject(body);
      });
    });
  };

  /**
   * setup
   * @returns {Promise}
   */
  this.genconfig = function () {
    return new Promise(function (resolve, reject) {
      self._parseVcap()
        .then(self._parameters)
        .then(resolve)
        .catch(reject);
    });
  };



  /**
   * do all tasks
   * @returns {Promise}
   */
  this.all = function () {
    return new Promise(function (resolve, reject) {
      self.build()
        .then(self.setup)
        .then(resolve)
        .catch(reject);
    });
  };

  return this;
};
