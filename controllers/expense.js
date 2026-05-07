'use strict';

var Expense = require('../models/expense');
var expenseModel = require('../lib/expense-model');

function parseExpenseId(raw) {
    var id = parseInt(raw, 10);
    return Number.isFinite(id) && id > 0 ? id : null;
}

function toNormalizeInput(existing, body) {
    var b = body || {};
    var base = existing || {};
    return {
        merchant: b.merchant != null ? b.merchant : base.merchant,
        total: b.total != null ? b.total : base.total,
        currency: b.currency != null ? b.currency : base.currency,
        transactionDate:
            b.transactionDate !== undefined ? b.transactionDate : base.transactionDate,
        subtotal: b.subtotal !== undefined ? b.subtotal : base.subtotal,
        taxTotal: b.taxTotal !== undefined ? b.taxTotal : base.taxTotal,
        category: b.category !== undefined ? b.category : base.category,
        lineItems: b.lineItems !== undefined ? b.lineItems : base.lineItems,
        paymentMethod: b.paymentMethod !== undefined ? b.paymentMethod : base.paymentMethod,
        notes: b.notes !== undefined ? b.notes : base.notes,
    };
}

module.exports = {
    list: async function (req, res) {
        try {
            var rows = await Expense.findByUserEmail(req.params.id);
            res.json({ expenses: rows });
        } catch (err) {
            res.status(500).json({ message: err.message || 'Internal server error' });
        }
    },

    getById: async function (req, res) {
        try {
            var eid = parseExpenseId(req.params.expenseId);
            if (!eid) {
                res.status(400).json({ message: 'Invalid expense id' });
                return;
            }
            var row = await Expense.findByIdForUser(eid, req.params.id);
            if (!row) {
                res.status(404).json({ message: 'Expense not found' });
                return;
            }
            res.json({ expense: row });
        } catch (err) {
            res.status(500).json({ message: err.message || 'Internal server error' });
        }
    },

    create: async function (req, res) {
        try {
            if (!req.body || !String(req.body.merchant || '').trim()) {
                res.status(400).json({ message: 'merchant is required' });
                return;
            }
            var norm = expenseModel.normalizeExpense(req.body);
            if (norm.total == null || norm.total < 0) {
                res.status(400).json({ message: 'total must be a non-negative number' });
                return;
            }
            var row = await Expense.insertExpense(req.params.id, {
                merchant: norm.merchant,
                total: norm.total,
                currency: norm.currency,
                transactionDate: norm.transactionDate,
                subtotal: norm.subtotal,
                taxTotal: norm.taxTotal,
                category: norm.category,
                lineItems: norm.lineItems,
                paymentMethod: norm.paymentMethod,
                notes: norm.notes,
            });
            res.status(201).json({ expense: row });
        } catch (err) {
            res.status(500).json({ message: err.message || 'Internal server error' });
        }
    },

    update: async function (req, res) {
        try {
            var eid = parseExpenseId(req.params.expenseId);
            if (!eid) {
                res.status(400).json({ message: 'Invalid expense id' });
                return;
            }
            var existing = await Expense.findByIdForUser(eid, req.params.id);
            if (!existing) {
                res.status(404).json({ message: 'Expense not found' });
                return;
            }
            var merged = toNormalizeInput(existing, req.body);
            var norm = expenseModel.normalizeExpense(merged);
            var row = await Expense.updateExpense(eid, req.params.id, {
                merchant: norm.merchant,
                total: norm.total,
                currency: norm.currency,
                transactionDate: norm.transactionDate,
                subtotal: norm.subtotal,
                taxTotal: norm.taxTotal,
                category: norm.category,
                lineItems: norm.lineItems,
                paymentMethod: norm.paymentMethod,
                notes: norm.notes,
            });
            if (!row) {
                res.status(404).json({ message: 'Expense not found' });
                return;
            }
            res.json({ expense: row });
        } catch (err) {
            res.status(500).json({ message: err.message || 'Internal server error' });
        }
    },

    remove: async function (req, res) {
        try {
            var eid = parseExpenseId(req.params.expenseId);
            if (!eid) {
                res.status(400).json({ message: 'Invalid expense id' });
                return;
            }
            var ok = await Expense.deleteExpense(eid, req.params.id);
            if (!ok) {
                res.status(404).json({ message: 'Expense not found' });
                return;
            }
            res.status(204).send();
        } catch (err) {
            res.status(500).json({ message: err.message || 'Internal server error' });
        }
    },
};
