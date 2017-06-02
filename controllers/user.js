const userModel = require('../models/user');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
var emailValidator = require("email-validator");

const config = require('../config');

const randomstring = require("randomstring");

const mailer = require('./mailer');

var controller = {
    register: (name, email, password) => {
        return new Promise((resolve, reject) => {
            if (!emailValidator.validate(email)) {
                reject({
                    status: 401,
                    message: 'Invalid Email'
                })
            } else {
                controller.get(email)
                    .then(user => {
                        reject({
                            status: 401,
                            message: 'Email already exist'
                        })
                    })
                    .catch(err => {
                        if (err.status === 400) {
                            const salt = bcrypt.genSaltSync(10);
                            const hash = bcrypt.hashSync(password, salt);

                            const newUser = new userModel({
                                name: name,
                                email: email,
                                hashed_password: hash,
                                created_at: new Date(),
                                activated: false
                            });
                            newUser.save()
                                .then(() => {
                                    controller.sendActivationMail(newUser);
                                    resolve({
                                        status: 201,
                                        message: 'User registered sucessfully'
                                    })
                                })
                                .catch(err => {
                                    if (err.code == 11000) {
                                        reject({
                                            status: 409,
                                            message: 'User already registered'
                                        });
                                    } else {
                                        reject({
                                            status: 500,
                                            message: 'Internal server error'
                                        });
                                    }
                                });
                        } else {
                            reject({
                                status: 500,
                                message: "Internal server error"
                            })
                        }
                    });


            }
        });
    },
    sendActivationMail: (user) => {
        const salt = bcrypt.genSaltSync(10);
        const random = randomstring.generate({
            length: 6,
            charset: 'numeric'
        });
        const temp_hash = bcrypt.hashSync(random, salt);

        user.temp_password = temp_hash;
        user.temp_password_time = new Date();
        user.save();

        console.log("sending activation mail...");
        var info = mailer.sendActivationMail(random, user);
        console.log(info);
        console.log("sent activation mail...");
    },
    activate: (email, token) => {
        return new Promise((resolve, reject) => {
            controller.getWritable(email)
                .then(user => {
                    console.log("activating...");
                    console.log(user);
                    const diff = new Date() - new Date(user.temp_password_time);
                    const seconds = Math.floor(diff / 1000);
                    console.log(`Seconds : ${seconds}`);

                    if (seconds <= config.activationTimeout) {
                        return user;
                    } else {
                        reject({
                            status: 401,
                            message: 'Time Out, Try again'
                        });
                    }
                }).then(user => {
                    if (bcrypt.compareSync(token, user.temp_password)) {
                        user.activated = true;
                        user.save();
                        resolve({
                            status: 200,
                            message: email
                        })
                    } else {
                        reject({
                            status: 401,
                            message: 'Invalid Token'
                        });
                    }
                })
                .catch(err => reject({
                    status: 500,
                    message: err.message
                }));
        });
    },
    login: (email, password) => {
        return new Promise((resolve, reject) => {
            controller.getWritable(email)
                .then(user => {
                    const hashed_password = user.hashed_password;
                    //password correct
                    if (bcrypt.compareSync(password, hashed_password)) {
                        //user not activated
                        if (!user.activated) {
                            controller.sendActivationMail(user)
                            reject({
                                status: 401,
                                message: 'User not activated'
                            });
                        }
                        //user activated
                        else {
                            resolve({
                                status: 200,
                                message: email
                            });
                        }
                    }
                    //email or password incorrect
                    else {
                        reject({
                            status: 401,
                            message: 'Invalid Credentials'
                        });
                    }
                })
                .catch(err => {
                    console.log(err);
                    reject({
                        status: 500,
                        message: 'Internal Server Error'
                    })
                });
        });
    },
    get: (email) => {
        return new Promise((resolve, reject) => {
            userModel.find({
                    email: email
                }, {
                    name: 1,
                    email: 1,
                    created_at: 1,
                    temp_password: 1,
                    temp_password_time: 1,
                    activated: 1,
                    _id: 0,
                })
                .then(users => {
                    if (users.length === 0) {
                        reject({
                            status: 400,
                            message: 'User Not Found'
                        })
                    } else {
                        resolve(users[0])
                    }
                })
                .catch(err => reject({
                    status: 500,
                    message: 'Internal Server Error'
                }));
        });
    },
    getWritable: (email) => {
        return new Promise((resolve, reject) => {
            userModel.find({
                    email: email
                })
                .then(users => {
                    if (users.length === 0) {
                        reject({
                            status: 400,
                            message: 'User Not Found'
                        })
                    } else {
                        resolve(users[0])
                    }
                })
                .catch(err => reject({
                    status: 500,
                    message: 'Internal Server Error'
                }));
        });
    },
    changePassword: (email, password, newPassword) => {
        return new Promise((resolve, reject) => {
            userModel.find({
                    email: email
                })
                .then(users => {
                    let user = users[0];
                    const hashed_password = user.hashed_password;
                    if (bcrypt.compareSync(password, hashed_password)) {
                        const salt = bcrypt.genSaltSync(10);
                        const hash = bcrypt.hashSync(newPassword, salt);
                        user.hashed_password = hash;
                        return user.save();
                    } else {
                        reject({
                            status: 401,
                            message: 'Invalid Old Password'
                        });
                    }
                })
                .then(user => resolve({
                    status: 200,
                    message: 'Password updated sucessfully'
                }))
                .catch(err => reject({
                    status: 500,
                    message: 'Internal server error'
                }));
        });
    },
    resetPasswordInit: (email) => {
        return new Promise((resolve, reject) => {
            const random = randomstring.generate(8);
            controller.getWritable(email)
                .then(user => {
                    const salt = bcrypt.genSaltSync(10);
                    const hash = bcrypt.hashSync(random, salt);
                    user.temp_password = hash;
                    user.temp_password_time = new Date();
                    return user.save();
                })
                .then(user => {
                    return mailer.sendResetPasswordMail(random, user);
                })
                .then(info => {
                    console.log(info);
                    resolve({
                        status: 200,
                        message: 'Check mail for instructions'
                    })
                })
                .catch(err => {
                    console.log(err);
                    reject({
                        status: 500,
                        message: 'Internal server error'
                    });
                });
        });
    },
    resetPasswordFinish: (email, token, password) => {
        return new Promise((resolve, reject) => {
            controller.getWritable(email)
                .then(user => {
                    console.log(user);
                    const diff = new Date() - new Date(user.temp_password_time);
                    const seconds = Math.floor(diff / 1000);
                    console.log(`Seconds : ${seconds}`);

                    if (seconds < config.password.resetTimeout) {
                        return user;
                    } else {
                        reject({
                            status: 401,
                            message: 'Time Out, Try again'
                        });
                    }
                }).then(user => {
                    if (bcrypt.compareSync(token, user.temp_password)) {
                        const salt = bcrypt.genSaltSync(10);
                        const hash = bcrypt.hashSync(password, salt);
                        user.hashed_password = hash;
                        user.temp_password = undefined;
                        user.temp_password_time = undefined;
                        return user.save();
                    } else {
                        reject({
                            status: 401,
                            message: 'Invalid Token'
                        });
                    }
                })
                .then(user => resolve({
                    status: 200,
                    message: 'Password Changed Successfully '
                }))
                .catch(err => reject({
                    status: 500,
                    message: err.message
                }));
        });
    }
}

module.exports = controller;
