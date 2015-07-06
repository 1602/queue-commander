
'use strict';

process.env.NODE_ENV = 'test';
module.exports = require('should');

if (!process.env.TRAVIS) {

    if (typeof __cov === 'undefined') {
        process.on('exit', function () {
            require('semicov').report();
        });
    }
}

require('semicov').init(['lib']);

