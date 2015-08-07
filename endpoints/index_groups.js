
module.exports = function(config, redis, logger) {
  var index_groups = require('../index/groups.js')(config, redis, logger);
  var index_middleware = require('../index/middleware.js')(config, redis, logger);

  var endpoints = {
    name: 'groupControl',
    description: 'Add group and user permission to get resources',
    endpoints: [
      {
        name: 'Create Group',
        description: 'Create a group, the first user is administrator',
        method: 'POST',
        path: '/groups/',
        version: '1.0.0',
        fn: index_groups.createGroup,
        middleware: [
          index_middleware.requireAuth
        ]
      },

      {
        name: 'Add user to group',
        description: 'Add user into group, default permition is admin',
        method: 'PUT',
        path: '/groups/:groupname/members/:username/permission/:permission',
        version: '1.0.0',
        fn: index_groups.addGroup,
        middleware: [
          index_middleware.requireAuth
        ]
      },

      {
        name: 'Delete user in group',
        description: 'delete user in group, admin can delete everyone, user can delete self',
        method: 'DEL',
        path: '/groups/:groupname/members/:username',
        version: '1.0.0',
        fn: index_groups.deleteGroupUser,
        middleware: [
          index_middleware.requireAuth
        ]
      },

      {
        name: 'Delete group',
        description: 'delete user in group, admin can delete everyone, user can delete self',
        method: 'DEL',
        path: '/groups/:groupname',
        version: '1.0.0',
        fn: index_groups.deleteGroup,
        middleware: [
          index_middleware.requireAuth
        ]
      }
    ]
  };

  return endpoints;
}
