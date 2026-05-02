'use strict';

var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..');
var userConfigPath = path.join(root, 'config.js');

if (fs.existsSync(userConfigPath)) {
    module.exports = require(userConfigPath);
} else if (process.env.NODE_ENV === 'test') {
    module.exports = require(path.join(root, 'test/fixtures/config.js'));
} else {
    throw new Error(
        'Missing config.js in project root. Add one (see README) or run tests with NODE_ENV=test.'
    );
}
