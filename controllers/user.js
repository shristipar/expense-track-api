const User = require('../models/user');
const bcrypt = require('bcryptjs');
var emailValidator = require('email-validator');

const config = require('../lib/app-config');

const randomstring = require('randomstring');

const mailer = require('./mailer');

var controller = {
    register: async function (name, email, password) {
        if (!emailValidator.validate(email)) {
            throw { status: 401, message: 'Invalid Email' };
        }
        var existing = await User.findByEmail(email);
        if (existing) {
            throw { status: 401, message: 'Email already exist' };
        }
        var salt = bcrypt.genSaltSync(10);
        var hash = bcrypt.hashSync(password, salt);
        try {
            var newUser = await User.insertUser({
                name: name,
                email: email,
                hashed_password: hash,
                activated: false,
            });
            await controller.sendActivationMail(newUser);
            return {
                status: 201,
                message: 'User registered sucessfully',
            };
        } catch (err) {
            if (err.code === '23505') {
                throw {
                    status: 409,
                    message: 'User already registered',
                };
            }
            throw {
                status: 500,
                message: 'Internal server error',
            };
        }
    },

    sendActivationMail: async function (user) {
        var salt = bcrypt.genSaltSync(10);
        var random = randomstring.generate({
            length: 6,
            charset: 'numeric',
        });
        var temp_hash = bcrypt.hashSync(random, salt);
        await User.updateByEmail(user.email, {
            temp_password: temp_hash,
            temp_password_time: new Date(),
        });
        console.log('sending activation mail...');
        var info = mailer.sendActivationMail(random, user);
        console.log(info);
        console.log('sent activation mail...');
    },

    activate: async function (email, token) {
        try {
            var user = await controller.getWritable(email);
            console.log('activating...');
            console.log(user);
            var diff = new Date() - new Date(user.temp_password_time);
            var seconds = Math.floor(diff / 1000);
            console.log('Seconds : ' + seconds);

            if (seconds > config.activationTimeout) {
                throw {
                    status: 401,
                    message: 'Time Out, Try again',
                };
            }
            if (!bcrypt.compareSync(token, user.temp_password)) {
                throw {
                    status: 401,
                    message: 'Invalid Token',
                };
            }
            await User.updateByEmail(email, { activated: true });
            return {
                status: 200,
                message: email,
            };
        } catch (err) {
            if (err.status && err.status !== 400) {
                throw err;
            }
            throw {
                status: 500,
                message: err.message || 'Internal server error',
            };
        }
    },

    login: async function (email, password) {
        try {
            var user = await controller.getWritable(email);
            if (!bcrypt.compareSync(password, user.hashed_password)) {
                throw {
                    status: 401,
                    message: 'Invalid Credentials',
                };
            }
            if (!user.activated) {
                await controller.sendActivationMail(user);
                throw {
                    status: 401,
                    message: 'User not activated',
                };
            }
            return {
                status: 200,
                message: email,
            };
        } catch (err) {
            if (err.status) {
                throw err;
            }
            console.log(err);
            throw {
                status: 500,
                message: 'Internal Server Error',
            };
        }
    },

    get: async function (email) {
        try {
            var row = await User.findPublicByEmail(email);
            if (!row) {
                throw {
                    status: 400,
                    message: 'User Not Found',
                };
            }
            return row;
        } catch (err) {
            if (err.status) {
                throw err;
            }
            throw {
                status: 500,
                message: 'Internal Server Error',
            };
        }
    },

    getWritable: async function (email) {
        var user = await User.findByEmail(email);
        if (!user) {
            throw {
                status: 400,
                message: 'User Not Found',
            };
        }
        return user;
    },

    changePassword: async function (email, password, newPassword) {
        try {
            var user = await User.findByEmail(email);
            if (!user) {
                throw {
                    status: 500,
                    message: 'Internal server error',
                };
            }
            if (!bcrypt.compareSync(password, user.hashed_password)) {
                throw {
                    status: 401,
                    message: 'Invalid Old Password',
                };
            }
            var salt = bcrypt.genSaltSync(10);
            var hash = bcrypt.hashSync(newPassword, salt);
            await User.updateByEmail(email, { hashed_password: hash });
            return {
                status: 200,
                message: 'Password updated sucessfully',
            };
        } catch (err) {
            if (err.status) {
                throw err;
            }
            throw {
                status: 500,
                message: 'Internal server error',
            };
        }
    },

    resetPasswordInit: async function (email) {
        try {
            var random = randomstring.generate(8);
            var user = await controller.getWritable(email);
            var salt = bcrypt.genSaltSync(10);
            var hash = bcrypt.hashSync(random, salt);
            await User.updateByEmail(email, {
                temp_password: hash,
                temp_password_time: new Date(),
            });
            var refreshed = await User.findByEmail(email);
            var info = await mailer.sendResetPasswordMail(random, refreshed);
            console.log(info);
            return {
                status: 200,
                message: 'Check mail for instructions',
            };
        } catch (err) {
            console.log(err);
            throw {
                status: 500,
                message: 'Internal server error',
            };
        }
    },

    resetPasswordFinish: async function (email, token, password) {
        try {
            var user = await controller.getWritable(email);
            console.log(user);
            var diff = new Date() - new Date(user.temp_password_time);
            var seconds = Math.floor(diff / 1000);
            console.log('Seconds : ' + seconds);

            if (seconds >= config.password.resetTimeout) {
                throw {
                    status: 401,
                    message: 'Time Out, Try again',
                };
            }
            if (!bcrypt.compareSync(token, user.temp_password)) {
                throw {
                    status: 401,
                    message: 'Invalid Token',
                };
            }
            var salt = bcrypt.genSaltSync(10);
            var hash = bcrypt.hashSync(password, salt);
            await User.updateByEmail(email, {
                hashed_password: hash,
                temp_password: null,
                temp_password_time: null,
            });
            return {
                status: 200,
                message: 'Password Changed Successfully ',
            };
        } catch (err) {
            if (err.status) {
                throw err;
            }
            throw {
                status: 500,
                message: err.message,
            };
        }
    },
};

module.exports = controller;
