'use strict';

var express = require('express');
var multer = require('multer');
var receiptAgent = require('../services/receipt-agent');

var upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        if (!file.mimetype || file.mimetype.indexOf('image/') !== 0) {
            cb(new Error('Only image uploads are allowed'));
            return;
        }
        cb(null, true);
    }
});

var router = express.Router();

function sendJsonError(res, err, status) {
    var code = status || err.status || 500;
    res.status(code).json({
        error: err.message || 'Request failed',
        code: code
    });
}

/**
 * POST /api/receipts/parse
 * multipart field name: image
 *
 * Optional: if RECEIPT_AGENT_MOCK=1, returns a fixed expense without calling OpenAI.
 */
router.post('/parse', function (req, res) {
    if (process.env.RECEIPT_AGENT_MOCK === '1') {
        res.json({ expense: receiptAgent.mockExpense(), mock: true });
        return;
    }
    upload.single('image')(req, res, function (err) {
        if (err) {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    sendJsonError(res, { message: 'Image too large (max 12MB)', status: 413 }, 413);
                    return;
                }
                sendJsonError(res, { message: err.message || 'Upload error', status: 400 }, 400);
                return;
            }
            sendJsonError(res, err, 400);
            return;
        }
        if (!req.file || !req.file.buffer) {
            sendJsonError(res, { message: 'Missing file field "image" (multipart/form-data)', status: 400 }, 400);
            return;
        }
        receiptAgent.parseReceiptImage(req.file.buffer, req.file.mimetype)
            .then(function (expense) {
                res.json({ expense: expense });
            })
            .catch(function (e) {
                sendJsonError(res, e, e.status);
            });
    });
});

module.exports = router;
