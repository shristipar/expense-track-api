'use strict';

function pool() {
    return require('../lib/db').pool;
}

/**
 * @typedef {Object} UserRow
 * @property {number} id
 * @property {string} email
 * @property {string} name
 * @property {string} hashed_password
 * @property {Date} created_at
 * @property {string|null} temp_password
 * @property {Date|null} temp_password_time
 * @property {boolean} activated
 */

/**
 * @param {string} email
 * @returns {Promise<UserRow|null>}
 */
function findByEmail(email) {
    return pool()
        .query('SELECT * FROM users WHERE email = $1', [email])
        .then(function (res) {
            return res.rows[0] || null;
        });
}

/**
 * Public profile fields (matches previous Mongoose projection for GET /user/get).
 * @param {string} email
 */
function findPublicByEmail(email) {
    return pool()
        .query(
            'SELECT name, email, created_at, temp_password, temp_password_time, activated FROM users WHERE email = $1',
            [email]
        )
        .then(function (res) {
            return res.rows[0] || null;
        });
}

/**
 * @param {{ name: string, email: string, hashed_password: string, activated: boolean }} row
 * @returns {Promise<UserRow>}
 */
function insertUser(row) {
    return pool()
        .query(
            `INSERT INTO users (name, email, hashed_password, activated)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [row.name, row.email, row.hashed_password, row.activated]
        )
        .then(function (res) {
            return res.rows[0];
        })
        .catch(function (err) {
            if (err.code === '23505') {
                var dup = new Error('duplicate');
                dup.code = '23505';
                throw dup;
            }
            throw err;
        });
}

/**
 * @param {string} email
 * @param {Record<string, unknown>} patch snake_case column names; use null to set SQL NULL
 */
function updateByEmail(email, patch) {
    var keys = Object.keys(patch).filter(function (k) {
        return patch[k] !== undefined;
    });
    if (keys.length === 0) {
        return Promise.resolve();
    }
    var sets = [];
    var values = [];
    var i = 1;
    keys.forEach(function (k) {
        sets.push(k + ' = $' + i++);
        values.push(patch[k]);
    });
    values.push(email);
    var sql = 'UPDATE users SET ' + sets.join(', ') + ' WHERE email = $' + i;
    return pool().query(sql, values);
}

module.exports = {
    findByEmail: findByEmail,
    findPublicByEmail: findPublicByEmail,
    insertUser: insertUser,
    updateByEmail: updateByEmail,
};
