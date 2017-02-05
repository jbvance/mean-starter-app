const users = require('../../app/controllers/users.server.controller');
const passport = require('passport');

module.exports = function(app) {
  app.route('/signup')
    .get(users.renderSignup)
    .post(users.signup);

  app.route('/signin')
    .get(users.renderSignin)
    .post(passport.authenticate('local', {
      successRedirect: '/',
      failureRedirect: '/signin',
      failureFlash: true
    }));

  app.get('/signout', users.signout);


  //Forgot password functionality

  app.get('/forgot', function(req, res) {
    res.render('forgot', {
      user: req.user,
      title: "Reset Password",
      // Set the flash message variable
			messages: req.flash('error') || req.flash('info')
    });
  });

  //Process request to send password reset email
  app.post('/forgot', users.sendPasswordResetEmail);

  //Render the form to enter a new password if user is found
  app.get('/reset/:token', users.renderForgotPassword);
  app.post('/reset/:token', users.resetPassword);


};
