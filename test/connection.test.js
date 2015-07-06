
'use strict';

var QC = require('../');
var should = require('./');
var when = require('when');

describe('connection', function() {

    it('should be established for the server', function(done) {
        var qc = new QC();
        var server = qc.getServer();

        server.connect().then(function(c) {
            should.exist(c);
            done();
        }, done);
    });

    it('should be established only once for connected instance', function(done) {
        var qc = new QC();
        var server = qc.getServer();
        when.all([
            server.connect(),
            server.connect()
        ]).then(function(results) {
            (results[0] === results[1]).should.be.true;
            done();
        }, done);
    });

});

