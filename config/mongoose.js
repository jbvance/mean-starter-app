const config = require ('./config');
const mongoose = require ('mongoose')

module.exports = function(){
    //const db = mongoose.connect(config.db);
    const db = mongoose.connect(process.env.DB_URI);

    require('../app/models/user.server.model');

    return db;
};
