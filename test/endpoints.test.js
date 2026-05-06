'use strict';

var { describe, it, before, after } = require('node:test');
var assert = require('node:assert');
var request = require('supertest');

function uniqueEmail() {
    return 'u' + Date.now() + '_' + Math.floor(Math.random() * 1e6) + '@example.com';
}

function basicAuth(email, password) {
    return 'Basic ' + Buffer.from(email + ':' + password, 'utf8').toString('base64');
}

describe('HTTP API', { timeout: 120000 }, function () {
    var app;

    before(async function () {
        process.env.NODE_ENV = 'test';
        process.env.RECEIPT_AGENT_MOCK = '1';
        var dbmod = require('../lib/db');
        await dbmod.initPool();
        var migrate = require('../db/migrate');
        await migrate(dbmod.pool);
        await dbmod.pool.query('DELETE FROM users');
        app = require('../app');
    });

    after(async function () {
        var { pool } = require('../lib/db');
        await pool.end();
    });

    describe('GET /', function () {
        it('returns 200 HTML', async function () {
            var res = await request(app).get('/').expect(200);
            assert.ok(res.text.indexOf('Express') !== -1 || res.type.indexOf('html') !== -1);
        });
    });

    describe('POST /user/register', function () {
        it('returns 400 when fields are missing', async function () {
            var res = await request(app)
                .post('/user/register')
                .send({})
                .expect(400);
            assert.ok(res.body.message);
        });

        it('returns 401 for invalid email', async function () {
            var res = await request(app)
                .post('/user/register')
                .send({ name: 'A', email: 'not-an-email', password: 'secret12' })
                .expect(401);
            assert.equal(res.body.message, 'Invalid Email');
        });

        it('returns 201 for valid registration', async function () {
            var email = uniqueEmail();
            var res = await request(app)
                .post('/user/register')
                .send({ name: 'Test User', email: email, password: 'password123' })
                .expect(201);
            assert.ok(res.body.message);
        });
    });

    describe('GET /user/activate/:id/:token', function () {
        it('returns 401 for bad token', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'Act', email: email, password: 'password123' })
                .expect(201);
            var res = await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/000000')
                .expect(401);
            assert.ok(res.body.message);
        });

        it('returns 200 and token when activation code matches', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'Act2', email: email, password: 'password123' })
                .expect(201);
            var token = global.__testActivationTokenByEmail[email];
            assert.ok(token, 'activation token should be captured in test mode');
            var res = await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + token)
                .expect(200);
            assert.ok(res.body.token);
            assert.equal(res.body.message, email);
        });
    });

    describe('POST /user/authenticate', function () {
        it('returns 400 without Authorization header', async function () {
            var res = await request(app).post('/user/authenticate').expect(400);
            assert.ok(res.body.message);
        });

        it('returns 401 when user is not activated', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'N', email: email, password: 'password123' })
                .expect(201);
            var res = await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'password123'))
                .expect(401);
            assert.ok(res.body.message);
        });

        it('returns 200 and JWT after activation', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'Auth', email: email, password: 'password123' })
                .expect(201);
            var token = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + token)
                .expect(200);
            var res = await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'password123'))
                .expect(200);
            assert.ok(res.body.token);
        });
    });

    describe('POST /user/is-authorized/:id', function () {
        it('returns 401 without valid JWT', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'Z', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var res = await request(app)
                .post('/user/is-authorized/' + encodeURIComponent(email))
                .expect(401);
            assert.ok(res.body.message);
        });

        it('returns 200 with refreshed token when JWT is valid', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'Z2', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var auth = await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'password123'))
                .expect(200);
            var jwt = auth.body.token;
            var res = await request(app)
                .post('/user/is-authorized/' + encodeURIComponent(email))
                .set('x-access-token', jwt)
                .expect(200);
            assert.ok(res.body.token);
            assert.equal(res.body.message, email);
        });
    });

    describe('GET /user/get/:id', function () {
        it('returns 401 without JWT', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'G', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var res = await request(app)
                .get('/user/get/' + encodeURIComponent(email))
                .expect(401);
            assert.ok(res.body.message);
        });

        it('returns user JSON with valid JWT', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'G2', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var auth = await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'password123'))
                .expect(200);
            var res = await request(app)
                .get('/user/get/' + encodeURIComponent(email))
                .set('x-access-token', auth.body.token)
                .expect(200);
            assert.equal(res.body.email, email);
            assert.equal(res.body.name, 'G2');
        });
    });

    describe('POST /user/pass/change/:id', function () {
        it('returns 401 with invalid JWT', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'P', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var res = await request(app)
                .post('/user/pass/change/' + encodeURIComponent(email))
                .send({ password: 'password123', newPassword: 'newpass456' })
                .expect(401);
            assert.ok(res.body.message);
        });

        it('returns 400 when passwords are missing', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'P2', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var auth = await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'password123'))
                .expect(200);
            var res = await request(app)
                .post('/user/pass/change/' + encodeURIComponent(email))
                .set('x-access-token', auth.body.token)
                .send({})
                .expect(400);
            assert.ok(res.body.message);
        });

        it('returns 200 when old password is correct', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'P3', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var auth = await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'password123'))
                .expect(200);
            var res = await request(app)
                .post('/user/pass/change/' + encodeURIComponent(email))
                .set('x-access-token', auth.body.token)
                .send({ password: 'password123', newPassword: 'newsecret99' })
                .expect(200);
            assert.ok(res.body.message);
            await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'newsecret99'))
                .expect(200);
        });
    });

    describe('GET /user/pass/reset/:id/:token', function () {
        it('returns 200 HTML', async function () {
            var res = await request(app)
                .get('/user/pass/reset/a@b.com/abc123')
                .expect(200);
            assert.ok(res.text.indexOf('Reset Password') !== -1 || res.type.indexOf('html') !== -1);
        });
    });

    describe('POST /user/pass/reset/:id', function () {
        it('initiates reset when token and password are omitted', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'R', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            var res = await request(app)
                .post('/user/pass/reset/' + encodeURIComponent(email))
                .send({})
                .expect(200);
            assert.ok(res.body.message);
            assert.ok(global.__testResetTokenByEmail[email]);
        });

        it('completes reset when token and new password are sent', async function () {
            var email = uniqueEmail();
            await request(app)
                .post('/user/register')
                .send({ name: 'R2', email: email, password: 'password123' })
                .expect(201);
            var act = global.__testActivationTokenByEmail[email];
            await request(app)
                .get('/user/activate/' + encodeURIComponent(email) + '/' + act)
                .expect(200);
            await request(app)
                .post('/user/pass/reset/' + encodeURIComponent(email))
                .send({})
                .expect(200);
            var resetTok = global.__testResetTokenByEmail[email];
            assert.ok(resetTok);
            var res = await request(app)
                .post('/user/pass/reset/' + encodeURIComponent(email))
                .send({ token: resetTok, password: 'brandnewpass1' })
                .expect(200);
            assert.ok(res.body.message);
            await request(app)
                .post('/user/authenticate')
                .set('Authorization', basicAuth(email, 'brandnewpass1'))
                .expect(200);
        });
    });

    describe('POST /api/receipts/parse', function () {
        it('returns mock expense when RECEIPT_AGENT_MOCK=1', async function () {
            var res = await request(app).post('/api/receipts/parse').expect(200);
            assert.equal(res.body.mock, true);
            assert.ok(res.body.expense);
            assert.ok(res.body.expense.merchant);
            assert.equal(typeof res.body.expense.total, 'number');
        });
    });
});
