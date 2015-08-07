var crypto = require('crypto');

module.exports = function(config, redis, logger) {

  function _createUser(username, password, email, isFromCreate, res, next) {
      redis.get("users:" + username, function(err, value) {
        if (err) {
          res.send(500, err);
          return next();
        }

        if (value == null) {
          // User Does Not Exist, Create!
          var shasum = crypto.createHash("sha1");
          shasum.update(password);
          var sha1 = shasum.digest("hex");
          
          var userObj = {};

          userObj.username = username;
          userObj.password = sha1;
          userObj.email = email;
          userObj.permissions = {"library":"admin"};
          namespace = username.split("@")[0];
          userObj.permissions[namespace] = "admin";

          //set user groups
         // userObj.groups = {"bird":"admin","fly":"read"};
          
          if (config.private == true || config.disable_new_accounts == true)
            userObj.disabled = true;

          // Check to make sure the password is valid.
          if (userObj.password != sha1) {
            res.send(400, {message: "bad username and/or password (2)"});
            return next();
          }

          redis.set("users:" + userObj.username, JSON.stringify(userObj), function(err, status) {
            if (err) {
              res.send(500, err);
              return next();
            }

            redis.sadd('users', userObj.username, function(err) {
              if (err) {
                res.send(500, err);
                return next();
              }
              if (isFromCreate){  
                res.send(201, {message: 'account created successfully'});
              } else {
                res.send(200)
              }
              return next();
            });
          });
        }
        else {
          res.send(400, 'Username or email already exists');
          return next();
        }
      });
  }
  return {
   createUser: function (req, res, next) {
      // Validate against a-z0-9_ regexx

      // Allow for account registrations to be disabled.
      // See: https://github.com/docker/docker/blob/fefaf6a73db52b6d20774f049d7456e2ba6ff5ca/registry/auth.go#L245
      if (config.disable_account_registration == true) {
        res.send(401);
        return next();
      }
      return _createUser(req.body.username, req.body.password, req.body.email, true, res, next)
    },
    updateUser: function (req, res, next) {
      redis.get("users:" + req.params.username, function(err, value) {
        if (err) {
          res.send(500, err);
          return next();
        }

        var user = JSON.parse(value) || {};

        var shasum = crypto.createHash("sha1");
        shasum.update(req.body.password);
        var sha1 = shasum.digest("hex");

        user.password = sha1;
        user.email = req.body.email;

        redis.set("users:" + req.params.username, JSON.stringify(user), function(err, status) {
          if (err) {
            res.send(500, err);
            return next();
          }
    
          res.send(204);
          return next();
        });
      });
    },

    validateUser: function(req, res, next) {
      console.log("Enter validateUsers")
      if (!req.headers.authorization) {
        console.log("no header")
        return res.send(401);
      }

      var auth = req.headers.authorization.split(' ');
      if (auth[0] == 'Basic') {
        var buff  = new Buffer(auth[1], 'base64');
        var plain = buff.toString();
        var creds = plain.split(':');
        var username  = creds[0];
        var password  = creds[1];
        console.log("username: " + username + "  password: " +password)
        redis.get("users:" + username, function(err, value) {
          if (err) {
            res.send(500, err);
            return next();
          }
          
          //create user it's not in redis
          //TODO: do not store the password in redis
          if (value == null){
            console.log("user not exist, create user...")
            return _createUser(username, password, null, false, res, next)  
          }
          var user = JSON.parse(value) || {};
          var shasum = crypto.createHash("sha1");
          shasum.update(password);
          var sha1 = shasum.digest("hex");

          if (user.disabled == true) {
            // Account not active (https://github.com/docker/docker/blob/fefaf6a73db52b6d20774f049d7456e2ba6ff5ca/registry/auth.go#L235)
            res.send(403, {message: "account is not active"});
            return next();
          }

          // Check to make sure the password is valid.
          if (user.password != sha1) {
            // Bad login (https://github.com/docker/docker/blob/fefaf6a73db52b6d20774f049d7456e2ba6ff5ca/registry/auth.go#L233)
            console.log("password does not match!")
            res.send(401, {message: "bad username and/or password (2)"});
            return next();
          }

          // Login Succeeded (https://github.com/docker/docker/blob/fefaf6a73db52b6d20774f049d7456e2ba6ff5ca/registry/auth.go#L231)
          res.send(200);
          return next();
        });
      }
      else {
        // Bad login (https://github.com/docker/docker/blob/fefaf6a73db52b6d20774f049d7456e2ba6ff5ca/registry/auth.go#L233)
        res.send(401); 
        return next();
      }
    }

  }
};

