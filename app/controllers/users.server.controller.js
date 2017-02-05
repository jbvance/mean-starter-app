// Load the module dependencies
const User = require('mongoose').model('User');
const passport = require('passport');
const async = require('async');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Mailgun = require('mailgun-js');


// Create a new error handling controller method
const getErrorMessage = function(err) {
	// Define the error message variable
	//const message = '';
  var message = '';

	// If an internal MongoDB error occurs get the error message
	if (err.code) {
		switch (err.code) {
			// If a unique index error occurs set the message error
			case 11000:
			case 11001:
				message = err.message;//'Username already exists';
				break;
			// If a general error occurs set the message error
			default:
				message = 'Something went wrong';
		}
	} else {
		// Grab the first error message from a list of possible errors
		for (var errName in err.errors) {
			if (err.errors[errName].message) message = err.errors[errName].message;
		}
	}

	// Return the message error
	return message;
};

// Create a new controller method that renders the signin page
exports.renderSignin = function(req, res, next) {
	// If user is not connected render the signin page, otherwise redirect the user back to the main application page
	if (!req.user) {
		// Use the 'response' object to render the signin page
		res.render('signin', {
			// Set the page title variable
			title: 'Sign-in Form',
			// Set the flash message variable
			messages: req.flash('error') || req.flash('info')
		});
	} else {
		return res.redirect('/');
	}
};

// Create a new controller method that renders the signup page
exports.renderSignup = function(req, res, next) {
	// If user is not connected render the signup page, otherwise redirect the user back to the main application page
	if (!req.user) {
		// Use the 'response' object to render the signup page
		res.render('signup', {
			// Set the page title variable
			title: 'Sign-up Form',
			// Set the flash message variable
			messages: req.flash('error')
		});
	} else {
		return res.redirect('/');
	}
};

// Create a new controller method that creates new 'regular' users
exports.signup = function(req, res, next) {
	// If user is not connected, create and login a new user, otherwise redirect the user back to the main application page
	if (!req.user) {
    var password = req.body.password
		// Create a new 'User' model instance
		const user = new User(req.body);
		const message = null;
    //require password to be at least six characters
    if (password.length < 6){
      const message = "Password must be at least six characters";
      // Set the flash messages
      req.session.flash = {type: 'danger', intro: 'Invalid Password:  ', message: message};
      // Redirect the user back to the signup page
      return res.redirect('/signup');
    }
		// Set the user provider property
		user.provider = 'local';

    user.setPassword(req.body.password);

		// Try saving the new user document
		user.save((err) => {
      var token
			// If an error occurs, use flash messages to report the error
			if (err) {
				// Use the error handling method to get the error message
				const message = getErrorMessage(err);

				// Set the flash messages
				req.session.flash = {type: 'danger', intro: 'Error:  ', message: message};

				// Redirect the user back to the signup page
				return res.redirect('/signup');
			}

			// If the user was created successfully use the Passport 'login' method to login
			req.login(user, (err) => {
				// If a login error occurs move to the next middleware
				if (err) return next(err);

				// Redirect the user back to the main application page with a confirmation message
        req.session.flash = {type: 'success', intro: 'Sign up successfull', message: 'You have successfully signed up'};
				return res.redirect('/');
			});
		});
	} else { //login was successfull
    token = user.generateJwt();
		return res.redirect('/');
	}
};

// Create a new controller method that creates new 'OAuth' users
exports.saveOAuthUserProfile = function(req, profile, done) {
	// Try finding a user document that was registered using the current OAuth provider
	User.findOne({
		provider: profile.provider,
		providerId: profile.providerId
	}, (err, user) => {
		// If an error occurs continue to the next middleware
		if (err) {
			return done(err);
		} else {
			// If a user could not be found, create a new user, otherwise, continue to the next middleware
			if (!user) {
				// Set a possible base username
				const possibleUsername = profile.username || ((profile.email) ? profile.email.split('@')[0] : '');

				// Find a unique available username
				User.findUniqueUsername(possibleUsername, null, (availableUsername) => {
					// Set the available user name
					profile.username = availableUsername;

					// Create the user
					user = new User(profile);

					// Try saving the new user document
					user.save(function(err) {
						// Continue to the next middleware
						return done(err, user);
					});
				});
			} else {
				// Continue to the next middleware
				return done(err, user);
			}
		}
	});
};

// Create a new controller method for signing out
exports.signout = function(req, res) {
	// Use the Passport 'logout' method to logout
	req.logout();

	// Redirect the user back to the main application page
	res.redirect('/');
};

exports.renderForgotPassword = function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      console.log("setting flash");
      //req.session.flash = {type:'danger', intro: 'Invalid Link:  ', mesasge: 'Password reset token is invalid or has expired.'};
      req.session.flash = {type: 'danger', intro: "Invalid Link:  ", message: 'Password reset token is invalid or has expired.\n\n Please enter your email and '+
        'click \'Reset Password\' to be sent a new link.' };
      return res.redirect('/forgot');
    }
    res.render('reset', {
      title: 'Reset Password',
      user: req.user
    });
  });
};

exports.sendPasswordResetEmail = function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.session.flash = {type: 'danger', intro: "No Account:  ", message: 'No account with that email address exists.'};
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {

      //Mailgun info
      //Your api key, from Mailgun’s Control Panel
      var api_key = process.env.MAILGUN_API_KEY;

      //Your domain, from the Mailgun Control Panel
      var domain = process.env.MAILGUN_DOMAIN

      //Your sending email address
      var from_who = 'admin@texasestatedocs.com';

      //We pass the api_key and domain to the wrapper, or it won't be able to identify + send emails
     var mailgun = new Mailgun({apiKey: api_key, domain: domain});

     var data = {
     //Specify email data
       from: from_who,
     //The email to contact
       to: req.body.email,
     //Subject and text data
       subject: 'Hello from Texas Estate Docs',
       html: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
     }

     //Invokes the method to send emails given the above data with the helper library
     mailgun.messages().send(data, function (err, body) {
         req.session.flash = {type: 'info', intro: 'Message Sent:  ', message: 'An e-mail has been sent to ' + user.email + ' with further instructions.'};
         done(err, 'done');
     });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
}

exports.resetPassword =  function(req, res, next) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.session.flash = {type: 'danger', intro: 'Invalid Token:  ', message: 'Password reset token is invalid or has expired.'};
          return res.redirect('back');
        }

        user.setPassword(req.body.password);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {

      //Mailgun info
      //Your api key, from Mailgun’s Control Panel
      var api_key = process.env.MAILGUN_API_KEY;

      //Your domain, from the Mailgun Control Panel
      var domain = process.env.MAILGUN_DOMAIN

      //Your sending email address
      var from_who = 'admin@texasestatedocs.com';

      //We pass the api_key and domain to the wrapper, or it won't be able to identify + send emails
     var mailgun = new Mailgun({apiKey: api_key, domain: domain});

     var data = {
     //Specify email data
       from: from_who,
     //The email to contact
       to: req.body.email,
     //Subject and text data
       subject: 'Your password has been changed',
       text: 'Hello,\n\n' +
           'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
     };

     //Invokes the method to send emails given the above data with the helper library
     mailgun.messages().send(data, function (err, body) {
         req.session.flash = {type: 'info', intro: 'Message Sent:  ', message: 'Your password has been successfully updated.'};
         done(err, 'done');
     });

    }
  ], function(err) {
    res.redirect('/');
  });
}
