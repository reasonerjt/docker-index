var crypto = require('crypto');
var util = require('util');
var wait=require('wait.for');

module.exports = function(config, redis, logger) {
  var index_helpers = require('./helpers.js')(config, redis);
  var result = null;

  //check user group permission
  function _checkUserGroupPermission(user, res, next) {
    // call myObj.querydata(arg1,arg2), wait for result, return data
    var keys = wait.forMethod(redis,'keys', 'group:*');
    console.log('mykeys' + keys);
  }

  //check auth method
  function _authMethod(req, res, next) {
      if (!req.headers.authorization) {
        res.send(401, 'authorization required');
        return next();
      }

      if (!req.params.namespace)
        req.params.namespace = 'library';

      var auth = req.headers.authorization.split(' ');

      logger.debug({headers: req.headers, url: req.url});

      if (auth[0] == 'Basic') {
        var buff  = new Buffer(auth[1], 'base64');
        var plain = buff.toString();
        var creds = plain.split(':');
        var user  = creds[0];
        var pass  = creds[1];

        var shasum = crypto.createHash('sha1');
        shasum.update(pass);
        var sha1pwd = shasum.digest('hex');

        var value = wait.forMethod(redis,'get', "users:" + user);

        if (value == null) {
          logger.debug({permission: req.permission, user: user, statusCode: 403, message: 'access denied: user not found'});
          res.send(403, 'access denied user not found')
          return next();
        }
      
        value = JSON.parse(value);

        // If the account is disabled, do not let it do anything at all
        if (value.disabled == true || value.disabled == "true") {
          logger.debug({message: "account is disabled", user: value.username});
          res.send(401, {message: "access denied account is disabled"})
          return next();
        }

        // Check that passwords match
        if (value.password == sha1pwd) {
          // TODO: Better handling for non repo images urls
          if (req.url == '/v1/users/') {
            return next();
          }

          // TODO: Better handling for non repo images urls
          var rePattern = new RegExp('/groups/*');                                                                                                              
          if (rePattern.test(req.url)) {                                                                                                                       
            return next();                                                                                                                                     
          }       

          var repo = req.params.namespace + '/' + req.params.repo;

          req.username = user;
          req.namespace = req.params.namespace;
          req.repo = repo;

          // Check for repo permissions
          req.permission = value.permissions[req.namespace] || value.permissions[req.repo] || 'none';

          /*this code will search group for user
          if (req.permission == "none") {
            var groups = value.groups;
            for (var key in groups) {
              if (key == req.namespace) {
                req.permission = groups[key];
                break;
              }
            }
          }
          */
          if (req.permission == 'none') {
            var tempValue = wait.forMethod(redis, 'smembers', 'group:' + req.namespace);
            if (tempValue == '') {
              req.permission = 'none';
            } else {
              for (var tempKey in tempValue) {
                var tempRes = JSON.parse(tempValue[tempKey]);
                if (tempRes.username == user) {
                  req.permission = 'admin';
                  break;
                }
              }
            }

          }

          if (req.permission == "none") {
            logger.debug({req: req, permission: req.permission, statusCode: 403, message: 'access denied: permission not set'});
            res.send(403, 'access denied');
            return next();
          }

          if (req.method == 'GET' && req.permission != "read" && req.permission != "admin") {
            logger.debug({req: req, permission: req.permission, statusCode: 403, message: 'access denied: GET requested'});
            res.send(403, "access denied");
            return next();
          }
    
          if (req.method == "PUT" && req.permission != "write" && req.permission != "admin") {
            logger.debug({req: req, permission: req.permission, statusCode: 403, message: 'access denied: PUT requested'});
            res.send(403, "access denied");
            return next();
          }
    
          if (req.method == "DELETE" && req.permission != "delete" && req.permission != "admin") {
            logger.debug({req: req, permission: req.permission, statusCode: 403, message: 'access denied: DELETE requested'});
            res.send(403, "access denied");
            return next();
          }

          var access = "none";
          switch (req.method) {
            case "GET":
              access = "read";
              break;
            case "PUT":
              access = "write";
              break;
            case "DELETE":
              access = "delete";
              break;
          }

          req.authed = true;

          index_helpers.generateToken(repo, access, function(err, token) {
            var repo = req.params.namespace + '/' + req.params.repo;

            req.token_auth = {token: token, repo: repo, access: access};

            var token = 'signature=' + token + ', repository="' + repo + '", access=' + access;

            logger.debug({namespace: req.params.namespace, repo: req.params.repo, token: token, access: access});

            res.setHeader('WWW-Authenticate', 'Token ' + token);
            res.setHeader('X-Docker-Token', token)
            res.setHeader('X-Docker-Endpoints', config.registries);

            return next();          
          })
        }
          else {
            logger.debug({statusCode: 401, message: 'access denied: valid authorization information is required'});
            res.send(401, 'Authorization required');
            return next();
          }
        
      }
      else if (auth[0] == 'Token') {
        var rePattern = new RegExp(/(\w+)[:=][\s"]?([^",]+)"?/g);
        var matches = req.headers.authorization.match(rePattern);

        var sig    = matches[0].split('=')[1];
        var repo   = matches[1].split('=')[1].replace(/\"/g, '');
        var access = matches[2].split('=')[1];

        req.token_auth = { token: sig, repo: repo, access: access };

        redis.get("tokens:" + sig, function(err, value) {
          if (err) {
            logger.error({err: err, token: sig});
            res.send(500, err);
            return next();
          }

          value = JSON.parse(value);
      
          if (value.repo == repo && value.access == access) {
            return next();
          }
          else {
            res.send(401, 'Authorization required');
            return next();
          }
        });
      }
  }

  return {
    requireAuth: function (req, res, next) {
       // launch a new fiber
       wait.launchFiber(_authMethod, req, res, next);
    },

  }; // end return
}; // end module.exports
