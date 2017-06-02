const config = require('../config');
var express = require('express');
var router = express.Router();
const auth = require('basic-auth');
const user = require('../controllers/user.js');
const jwtUtils = require('../controllers/jwt-utils');
router.post('/register', (req, res) => {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    if (!name || !email || !password || !name.trim() || !email.trim() || !password.trim()) {
        res.status(400).json({
            message: 'Invalid Request !'
        });
    }
    else {
        user.register(name, email, password).then(result => {
            //                res.setHeader('Location', '/users/' + email);
            res.status(result.status).json({
                message: result.message
            });
        }).catch(err => res.status(err.status).json({
            message: err.message
        }));
    }
});
router.get('/activate/:id/:token', (req, res) => {
    const email = req.params.id;
    const token = req.params.token;
    user.activate(email, token).then(result => {
        res.status(result.status).json({
            message: result.message,
            token: jwtUtils.getToken(result)
        });
    }).catch(err => res.status(err.status).json({
        message: err.message
    }));
});
router.post('/authenticate', (req, res) => {
    const credentials = auth(req);
    if (!credentials) {
        res.status(400).json({
            message: 'Invalid Request'
        });
    }
    else {
        user.login(credentials.name, credentials.pass).then(result => {
            res.status(result.status).json({
                message: result.message
                , token: jwtUtils.getToken(result)
            });
        }).catch(err => res.status(err.status).json({
            message: err.message
        }));
    }
});
router.post('/is-authorized/:id', jwtUtils.checkToken, (req, res) => {
    const result = {
        status: 200,
        message: req.params.id
    };
    
    res.status(200).json({
        token: jwtUtils.getToken(result),
        message: result.message
    });
});
router.get('/get/:id', jwtUtils.checkToken, (req, res) => {
    user.get(req.params.id)
        .then(result => res.json(result))
        .catch(err => {
            res.status(err.status).json({
                message: err.message
            })
        });
});
router.post('/pass/change/:id', (req, res) => {
    if (jwtUtils.checkToken(req)) {
        const oldPassword = req.body.password;
        const newPassword = req.body.newPassword;
        if (!oldPassword || !newPassword || !oldPassword.trim() || !newPassword.trim()) {
            res.status(400).json({
                message: 'Invalid Request !'
            });
        }
        else {
            user.changePassword(req.params.id, oldPassword, newPassword).then(result => res.status(result.status).json({
                message: result.message
            })).catch(err => res.status(err.status).json({
                message: err.message
            }));
        }
    }
    else {
        res.status(401).json({
            message: 'Invalid Token !'
        });
    }
});
router.get('/pass/reset/:id/:token', (req, res) => {
    res.render('pass-reset', {
        title: 'Password Reset'
        , token: req.params.token
        , id: req.params.id
    });
});
router.post('/pass/reset/:id', (req, res) => {
    const email = req.params.id;
    const token = req.body.token;
    const newPassword = req.body.password;
    if (!token || !newPassword || !token.trim() || !newPassword.trim()) {
        user.resetPasswordInit(email).then(result => {
            res.status(result.status).json({
                message: result.message
            })
        }).catch(err => res.status(err.status).json({
            message: err.message
        }));
    }
    else {
        user.resetPasswordFinish(email, token, newPassword).then(result => res.status(result.status).json({
            message: result.message
        })).catch(err => res.status(err.status).json({
            message: err.message
        }));
    }
});
module.exports = router;