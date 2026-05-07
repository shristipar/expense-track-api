'use strict';

function pool() {
    return require('../lib/db').pool;
}

function rowToExpense(row) {
    var lineItems = row.line_items;
    if (typeof lineItems === 'string') {
        try {
            lineItems = JSON.parse(lineItems);
        } catch (e) {
            lineItems = [];
        }
    }
    if (!Array.isArray(lineItems)) {
        lineItems = [];
    }
    var tx = row.transaction_date;
    var txStr = null;
    if (tx) {
        txStr = tx instanceof Date ? tx.toISOString().slice(0, 10) : String(tx).slice(0, 10);
    }
    return {
        id: row.id,
        userEmail: row.user_email,
        merchant: row.merchant,
        total: row.total != null ? Number(row.total) : 0,
        currency: row.currency,
        transactionDate: txStr,
        subtotal: row.subtotal != null ? Number(row.subtotal) : null,
        taxTotal: row.tax_total != null ? Number(row.tax_total) : null,
        category: row.category,
        lineItems: lineItems,
        paymentMethod: row.payment_method,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

function findByUserEmail(userEmail) {
    return pool()
        .query(
            'SELECT * FROM expenses WHERE user_email = $1 ORDER BY created_at DESC',
            [userEmail]
        )
        .then(function (res) {
            return res.rows.map(rowToExpense);
        });
}

function findByIdForUser(expenseId, userEmail) {
    return pool()
        .query('SELECT * FROM expenses WHERE id = $1 AND user_email = $2', [expenseId, userEmail])
        .then(function (res) {
            return res.rows[0] ? rowToExpense(res.rows[0]) : null;
        });
}

function insertExpense(userEmail, payload) {
    return pool()
        .query(
            `INSERT INTO expenses (
        user_email, merchant, total, currency, transaction_date,
        subtotal, tax_total, category, line_items, payment_method, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)
      RETURNING *`,
            [
                userEmail,
                payload.merchant,
                payload.total,
                payload.currency,
                payload.transactionDate || null,
                payload.subtotal,
                payload.taxTotal,
                payload.category,
                JSON.stringify(payload.lineItems || []),
                payload.paymentMethod,
                payload.notes,
            ]
        )
        .then(function (res) {
            return rowToExpense(res.rows[0]);
        });
}

function updateExpense(expenseId, userEmail, payload) {
    return pool()
        .query(
            `UPDATE expenses SET
        merchant = $3,
        total = $4,
        currency = $5,
        transaction_date = $6,
        subtotal = $7,
        tax_total = $8,
        category = $9,
        line_items = $10::jsonb,
        payment_method = $11,
        notes = $12,
        updated_at = NOW()
      WHERE id = $1 AND user_email = $2
      RETURNING *`,
            [
                expenseId,
                userEmail,
                payload.merchant,
                payload.total,
                payload.currency,
                payload.transactionDate || null,
                payload.subtotal,
                payload.taxTotal,
                payload.category,
                JSON.stringify(payload.lineItems || []),
                payload.paymentMethod,
                payload.notes,
            ]
        )
        .then(function (res) {
            return res.rows[0] ? rowToExpense(res.rows[0]) : null;
        });
}

function deleteExpense(expenseId, userEmail) {
    return pool()
        .query('DELETE FROM expenses WHERE id = $1 AND user_email = $2 RETURNING id', [
            expenseId,
            userEmail,
        ])
        .then(function (res) {
            return res.rows && res.rows.length > 0;
        });
}

module.exports = {
    findByUserEmail: findByUserEmail,
    findByIdForUser: findByIdForUser,
    insertExpense: insertExpense,
    updateExpense: updateExpense,
    deleteExpense: deleteExpense,
};
