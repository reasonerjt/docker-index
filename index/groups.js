var crypto = require('crypto');
var url  = require('url');

module.exports = function(config, redis, logger) {
  //add user into group, default permition is admin
  return {
   addGroup: function (req, res, next) {
      
      console.log("req" + req);
    
      console.log(req.params); //{Object}
      //console.log("params " + req.params('groupname') + " " + req.params('username'));
      return next();
    }

  }
};

