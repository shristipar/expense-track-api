'use strict';

var OpenAI = require('openai');
var expenseModel = require('../lib/expense-model');

var SYSTEM_PROMPT = [
    'You are a receipt-reading agent. Read the receipt image carefully.',
    'Return one JSON object only (no markdown) with keys:',
    'merchant (string), total (number), currency (ISO 4217 string),',
    'transactionDate (YYYY-MM-DD or null), subtotal (number|null), taxTotal (number|null),',
    'category (short label or null), lineItems (array of {description, quantity|null, unitPrice|null, amount|null}),',
    'paymentMethod (string|null), notes (string|null).',
    'Use null when unknown. Do not fabricate line items that are not visible.'
].join(' ');

/**
 * @param {Buffer} imageBuffer
 * @param {string} mimeType e.g. image/jpeg, image/png
 * @returns {Promise<object>} normalized expense
 */
function parseReceiptImage(imageBuffer, mimeType) {
    var key = process.env.OPENAI_API_KEY;
    if (!key) {
        var err = new Error('OPENAI_API_KEY is not set; configure it to parse receipts.');
        err.status = 503;
        return Promise.reject(err);
    }
    var mime = mimeType && String(mimeType).indexOf('image/') === 0 ? mimeType : 'image/jpeg';
    var model = process.env.OPENAI_RECEIPT_MODEL || 'gpt-4o-mini';
    var client = new OpenAI({ apiKey: key });
    var dataUrl = 'data:' + mime + ';base64,' + imageBuffer.toString('base64');

    return client.chat.completions.create({
        model: model,
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
                role: 'user',
                content: [
                    { type: 'text', text: 'Extract structured expense data from this receipt image.' },
                    { type: 'image_url', image_url: { url: dataUrl } }
                ]
            }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 2500
    }).then(function (response) {
        var text = response.choices[0] && response.choices[0].message && response.choices[0].message.content;
        if (!text) {
            var e = new Error('Empty model response');
            e.status = 502;
            throw e;
        }
        var raw;
        try {
            raw = JSON.parse(text);
        } catch (parseErr) {
            var pe = new Error('Model returned invalid JSON');
            pe.status = 502;
            throw pe;
        }
        return expenseModel.normalizeExpense(raw);
    });
}

function mockExpense() {
    return expenseModel.normalizeExpense({
        merchant: 'Demo Market',
        total: 42.5,
        currency: 'USD',
        transactionDate: '2026-04-28',
        subtotal: 39.2,
        taxTotal: 3.3,
        category: 'groceries',
        lineItems: [
            { description: 'Mixed items', quantity: 1, unitPrice: 39.2, amount: 39.2 }
        ],
        paymentMethod: 'card',
        notes: 'RECEIPT_AGENT_MOCK=1 — not from a real image'
    });
}

module.exports = {
    parseReceiptImage: parseReceiptImage,
    mockExpense: mockExpense
};
