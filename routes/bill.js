const config = require('../config');
var express = require('express');
var router = express.Router();

//const auth = require('basic-auth');

const user = require('../controllers/user.js');
const jwtUtils = require('../controllers/jwt-utils');

router.post('/add', jwtUtils.checkToken, (req,res) => {
    var merchant = req.body.merchant,
        amount = req.body.amount,
        currency = req.body.currency,
        date = req.body.date,
        category = req.body.category;
});

module.exports = router;
