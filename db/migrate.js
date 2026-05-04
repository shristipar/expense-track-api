'use strict';

var fs = require('fs');
var path = require('path');

/**
 * Apply schema (idempotent).
 * Runs one statement at a time (required for PGlite).
 * @param {{ query: (text: string, params?: unknown[]) => Promise<unknown> }} pool
 */
async function migrate(pool) {
    var sqlPath = path.join(__dirname, 'schema.sql');
    var sql = fs.readFileSync(sqlPath, 'utf8');
    var parts = sql
        .split(';')
        .map(function (s) {
            return s.trim();
        })
        .filter(function (s) {
            return s.length > 0;
        });
    for (var i = 0; i < parts.length; i++) {
        var stmt = parts[i].replace(/^--[^\n]*$/gm, '').trim();
        if (!stmt) {
            continue;
        }
        await pool.query(stmt);
    }
}

module.exports = migrate;
