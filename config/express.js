require('dotenv').load();
const config = require('./config');
const express = require('express');
const morgan = require('morgan');
const compress = require('compression');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const passport = require('passport');
const MongoStore = require('connect-mongo')(session);

module.exports = function(){

  var routesApi = require('../app/api/routes/index');

  const app = express();
  if (process.env.NODE_ENV === 'development'){
    app.use(morgan('dev'));
  } else if (process.env.NODE_ENV === 'production'){
    app.use(compress());
  }

  app.use(bodyParser.urlencoded({
    extended: true
  }));
  app.use(bodyParser.json());
  app.use(methodOverride());

  app.use(session({
    saveUninitialized: true,
    resave: true,
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
      url: process.env.SESSION_DB_URI,
      ttl: 2 * 24 * 60 * 60}) //persist sessio for 2 days
    //secret: config.sessionSecret
  }));

  app.set('views', './app/views');
  app.set('view engine', 'ejs');

  app.use(flash());
  app.use(passport.initialize());
  app.use(passport.session());


  app.use(function(req, res, next){
    //If there's a flash message jtransfer it
    //to the context, then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
  });

  require('../app/routes/index.server.routes.js')(app);
  require('../app/routes/users.server.routes.js')(app);
  app.use('/api', routesApi);

  //Should go below the require listed above - Order matters
  app.use(express.static('./public'));



  return app;
}
