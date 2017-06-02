const config = require('../config');
const jwt = require('jsonwebtoken');

var controller = {
    validToken: (req) => {
        const token = req.headers['x-access-token'];
        if (token) {
            try {
                var decoded = jwt.verify(token, config.secret);
                console.log(decoded);
                return decoded.message === req.params.id;
            } catch (err) {
                console.log(err);
                return false;
            }
        } else {
            return false;
        }
    },
    getToken: (result) => {
        return jwt.sign(result, config.secret, {
            expiresIn: config.jwtExpire
        });
    },
    checkToken: (req, res, next) => {
        if (!controller.validToken(req)) {
            res.status(401).json({
                message: 'invalid token'
            });
        } else {
            next();
        }
    }
}

module.exports = controller;
