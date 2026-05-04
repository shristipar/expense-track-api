// Copy to config.js and adjust. (config.js is gitignored.)
module.exports = {
  databaseUrl: 'postgresql://postgres:postgres@127.0.0.1:5432/snappbill',
  secret: 'your-jwt-secret',
  jwtExpire: '24h',
  baseURL: 'http://localhost:3000',
  activationTimeout: 86400,
  mailer: {
    email: 'your-smtp-user@example.com',
    password: 'your-smtp-password',
    name: 'SnappBill',
  },
  password: {
    resetTimeout: 3600,
  },
};
