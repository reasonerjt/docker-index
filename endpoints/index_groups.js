
module.exports = function(config, redis, logger) {
  var index_groups = require('../index/groups.js')(config, redis, logger);
  var index_middleware = require('../index/middleware.js')(config, redis, logger);

  var endpoints = {
    name: 'addGroup',
    description: 'Add user into group, default permition is admin',
    endpoints: [
      {
        name: 'Add Group',
        description: 'Add user into group, default permition is admin',
        method: 'GET',
        auth: false,
        path: '/group/add/:groupname/:username',
        version: '1.0.0',
        fn: index_groups.addGroup,
        middleware: [
          index_middleware.requireAuth
        ]
      }
    ]
  };

  return endpoints;
}
