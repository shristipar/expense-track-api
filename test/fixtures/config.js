'use strict';

/** Safe defaults for automated tests only (NODE_ENV=test, no root config.js). */
module.exports = {
    secret: 'test-jwt-secret-not-for-production',
    jwtExpire: '1h',
    baseURL: 'http://localhost:3000',
    activationTimeout: 86400,
    mailer: {
        email: 'test@example.com',
        password: '',
        name: 'Test',
    },
    password: {
        resetTimeout: 86400,
    },
};
