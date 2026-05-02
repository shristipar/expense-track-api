'use strict';

const config = require('../lib/app-config');
const mongoose = require('mongoose');
//const Schema = mongoose.Schema;

const userSchema = mongoose.Schema({
    name: String,
    email: String,
    hashed_password: String,
    created_at: String,
    temp_password: String,
    temp_password_time: String,
    activated: Boolean,
});

mongoose.Promise = global.Promise;
mongoose.connection.on('error', function (err) {
    console.error('MongoDB connection error:', err.message);
});
mongoose.connect(process.env.MONGODB_URI || config.mongodbConnect);

module.exports = mongoose.model('user', userSchema);
