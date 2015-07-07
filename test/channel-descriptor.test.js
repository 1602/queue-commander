
'use strict';

var QC = require('../');
var should = require('./');

describe('ChannelDescriptor', function() {

    it('should validate options', function() {
        var qc = new QC();
        (function() {
            qc.channel();
        }).should.throw('No opts no descriptor');
        (function() {
            qc.channel({});
        }).should.throw('Channel name required');
        (function() {
            qc.registerQueue('durga');
            qc.channel({name: 'name', input: 'durga'});
        }).should.not.throw();
    });

});

