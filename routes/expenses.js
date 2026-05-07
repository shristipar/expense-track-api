'use strict';

var express = require('express');
var router = express.Router();
var jwtUtils = require('../controllers/jwt-utils');
var expense = require('../controllers/expense');

router.get('/:id/:expenseId', jwtUtils.checkToken, expense.getById);
router.put('/:id/:expenseId', jwtUtils.checkToken, expense.update);
router.delete('/:id/:expenseId', jwtUtils.checkToken, expense.remove);
router.get('/:id', jwtUtils.checkToken, expense.list);
router.post('/:id', jwtUtils.checkToken, expense.create);

module.exports = router;
