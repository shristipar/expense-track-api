'use strict';

var { Pool } = require('pg');
var config = require('./app-config');

var _pool = null;

function wrapPglite(db) {
    return {
        query: function (text, params) {
            return db.query(text, params);
        },
        on: function () {},
        end: function () {
            return db.close();
        },
    };
}

/**
 * Create the DB pool (TCP Postgres) or in-memory PGlite when no URL is configured.
 * Must be awaited once before `require('../app')` or any code that uses `pool`.
 */
async function initPool() {
    if (_pool) {
        return _pool;
    }
    var connectionString = process.env.DATABASE_URL || config.databaseUrl;
    if (connectionString) {
        _pool = new Pool({
            connectionString: connectionString,
            max: 10,
        });
        _pool.on('error', function (err) {
            console.error('PostgreSQL pool error:', err.message);
        });
        return _pool;
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error(
            'PostgreSQL required in production: set DATABASE_URL or config.databaseUrl.'
        );
    }
    var { PGlite } = require('@electric-sql/pglite');
    var db = new PGlite();
    _pool = wrapPglite(db);
    console.log(
        'Using in-memory PostgreSQL (PGlite). Set DATABASE_URL or config.databaseUrl for a persistent server.'
    );
    return _pool;
}

function getPool() {
    if (!_pool) {
        throw new Error(
            'Database not initialized. Call await initPool() from bin/www (or tests) before loading the app.'
        );
    }
    return _pool;
}

Object.defineProperty(module.exports, 'pool', {
    enumerable: true,
    get: function () {
        return getPool();
    },
});

module.exports.initPool = initPool;
