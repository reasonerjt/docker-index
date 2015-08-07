var crypto = require('crypto');
var async = require('async');

module.exports = function(config, redis, logger) {
  function _checkGroupName (req, res, next, type) {

      var groupname = req.body.groupname;
      if (groupname == '' || groupname === undefined) {
        res.send(400, 'you can not create this group');
        return next();
      }
      var groupUsername = groupname + '@cn.ibm.com';

      //find whether has the same groupname in users  
      redis.smembers('users', function(err, value) {
        if (err) {
          res.send(500, err);
          return next();
        }

        for (var key in value) {
          if (value[key] == groupUsername) {
            res.send(400, 'groupname already exist');
            return next();
          }
        }


        //check redis groups key find whether has the same groupname
        redis.scard('group:' + groupname, function (err, value) {
          if (err) {
            res.send(500, err);
            return next();
          }

          //if value is 0, it means table has not this key
          if (value != 0) {
            res.send(400, 'groupname already exist');
            return next();
          } else if (value == 0) {
             if (type == 'createGroup') {
                _createGroup(req, res, next);
              }
          }
        });

      });

  }

  function _getRequestUsername (req) {

      var auth = req.headers.authorization.split(' ');

      if (auth[0] == 'Basic') {
        var buff  = new Buffer(auth[1], 'base64');
        var plain = buff.toString();
        var creds = plain.split(':');
        var user  = creds[0];
        //this will return bjchenxl@cn.ibm.com 
        return user;
      }
  } 

  function _createGroup(req, res, next) { 

      var username = _getRequestUsername(req);

      var group = {};
      group.username = username;
      /*group permission is administrator means it can delete other user
        and have the read write permission to images
      */
      group.permission = 'administrator';

      redis.sadd('group:' + req.body.groupname, JSON.stringify(group), function (err) {
        if (err) {
          res.send(500, err);
          return next();
        }

        res.send(201, 'group created successfully');
        return next();
      });
  }

  //add user into group, default permition is admin
  return {
   addGroup: function (req, res, next) {

      var groupname = req.params.groupname;
      var username = req.params.username;
      var permission = req.params.permission;
      //request this url name
      var ownName = _getRequestUsername(req);
      //check redis groups key find whether has the same groupname
      redis.smembers('group:' + groupname, function (err, value) {
        if (err) {
          res.send(500, err);
          return next();
        }

        //if value is null, it means there is not the key
        if (value == '') {
          res.send(400, 'this group does not exist, please create first');
          return next();
        }

        var hasPermission = false;
        var isExist = false;
        var cursorKey = -1;
        //check whether this user already in this group
        for (var key in value) {
          value[key] = JSON.parse(value[key]);
          if (value[key].username == username) {
              isExist = true;
              break;
          }

          if (value[key].username == ownName) {
              cursorKey = key;
          }

        }

        if (cursorKey != -1) {
            if (permission == 'admin') {
              if (value[cursorKey].permission == 'administrator') {
                hasPermission = true;
              }
            }

            if (permission == 'member') {
              hasPermission = true;
            }
        }

        if (isExist) {
          res.send(400, 'user already in this group');
          return next();
        }

        if (!hasPermission) {
          res.send(400, 'you have not permission to add user');
          return next();
        }

        var group = {};
        group.username = username;
        group.permission = permission;

        redis.sadd('group:' + req.params.groupname, JSON.stringify(group), function (err) {
          if (err) {
            res.send(500, err);
            return next();
          }

          res.send(201, 'add user into group successfully');
          return next();
        });


      });
   },

   createGroup: function (req, res, next) {
      _checkGroupName(req, res, next, 'createGroup');
      return next();
   },

   deleteGroupUser: function (req, res, next) {
      var groupname = req.params.groupname;
      var username = req.params.username;
      var user = _getRequestUsername(req);

      redis.smembers('group:' + groupname, function (err, value) {
        if (err) {
          res.send(500, err);
          return next();
        }

        var canDelete = false;
        var delKey = '';
        if (username == user) {
          canDelete = true;
        }

        for (var key in value) {
          value[key] = JSON.parse(value[key]);
          if (value[key].username == user) {
            if (value[key].permission == 'administrator' || value[key].permission == 'admin') {
              canDelete = true;
            }
           
          }

         if (value[key].username == username) {
            delKey = JSON.stringify(value[key]);
          }

        }

        //delete user
        if (canDelete && delKey != '') {
          redis.srem('group:' + groupname, delKey, function(err, value) {
            if (err) {
              res.send(500, err);
              return next();
            }

            res.send(201, 'delete successful');
            return next();
          });
        } else {
          res.send(201, 'you can not delete group ');
          return next();
        }

      }); 
   },

   deleteGroup: function (req, res, next) {
      var groupname = req.params.groupname;
      var user = _getRequestUsername(req);
      redis.smembers('group:' + groupname, function(err, value) {
        if (err) {
          res.send(500, err);
          return next();
        }

        var canDelete = false;
        for(var key in value) {
          value[key] = JSON.parse(value[key]);
          if (value[key].username == user) {
            if (value[key].permission = 'administrator') {
                canDelete = true;
                break;
            }
          }

        }

        if (canDelete) {
          redis.del('group:' + groupname, function(err) {
              if (err) {
                res.send(500, err);
                return next();
              }

              res.send(201, 'delete group successful');
              return next();
          });
        } else {
            res.send(400, 'you can not delete this group');
            return next();
        }
      });
   },

  }
};

