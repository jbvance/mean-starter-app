const users = require('../../app/controllers/users.server.controller');

module.exports = function(app) {
  app.route('/users')
    .post(users.create)
    .get(users.list);

  app.route('/users/:userId')
    .get(users.read)
    .put(users.update)
    .delete(users.delete);

 //middleware to find user by :userId param before any functions are called
 //that use the param
  app.param('userId', users.userByID);
};
