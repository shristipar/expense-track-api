'use strict';

/**
 * Canonical expense shape returned by the receipt agent.
 * @typedef {Object} Expense
 * @property {string} merchant
 * @property {number} total
 * @property {string} currency
 * @property {string|null} transactionDate ISO date YYYY-MM-DD
 * @property {number|null} subtotal
 * @property {number|null} taxTotal
 * @property {string|null} category
 * @property {Array<{description: string, quantity: number|null, unitPrice: number|null, amount: number|null}>} lineItems
 * @property {string|null} paymentMethod
 * @property {string|null} notes
 */

function num(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return Number.isFinite(n) ? n : null;
}

function str(v) {
    if (v === null || v === undefined) return null;
    var s = String(v).trim();
    return s.length ? s : null;
}

/**
 * Coerce model output into a stable Expense object.
 * @param {object} raw
 * @returns {Expense}
 */
function normalizeExpense(raw) {
    if (!raw || typeof raw !== 'object') {
        raw = {};
    }
    var lineItems = Array.isArray(raw.lineItems) ? raw.lineItems : [];
    lineItems = lineItems.map(function (row) {
        if (!row || typeof row !== 'object') return { description: '', quantity: null, unitPrice: null, amount: null };
        return {
            description: str(row.description) || str(row.name) || '',
            quantity: num(row.quantity),
            unitPrice: num(row.unitPrice),
            amount: num(row.amount)
        };
    }).filter(function (r) { return r.description; });

    return {
        merchant: str(raw.merchant) || 'Unknown',
        total: num(raw.total) != null ? num(raw.total) : 0,
        currency: (str(raw.currency) || 'USD').toUpperCase().slice(0, 3),
        transactionDate: str(raw.transactionDate) || null,
        subtotal: num(raw.subtotal),
        taxTotal: num(raw.taxTotal),
        category: str(raw.category),
        lineItems: lineItems,
        paymentMethod: str(raw.paymentMethod),
        notes: str(raw.notes)
    };
}

module.exports = {
    normalizeExpense: normalizeExpense
};
