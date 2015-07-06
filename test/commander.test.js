
'use strict';

var QC = require('../');
var should = require('./');

describe('commander', function() {

    it('should register queue with name and settings', function(){
        var qc = new QC();
        qc.registerQueue('test-queue');
        qc.registerQueue('another-test-queue', {durable: true});
        qc.queues.should.have.lengthOf(2);
        qc.queues[0].name.should.equal('test-queue');
        should.not.exist(qc.queues[0].settings);
        qc.queues[1].name.should.equal('another-test-queue');
        qc.queues[1].settings.durable.should.be.true;
    });

    it('should not allow creating channel without registering a queue', function() {
        var qc = new QC();
        (function() {
            qc.channel({
                name: 'TEST',
                input: 'hello-world'
            });
        }).should.throw('Queue "hello-world" is not declared');
        (function() {
            qc.registerQueue('hello-world');
            qc.channel({
                name: 'TEST',
                input: 'hello-world'
            });
        }).should.not.throw();
        (function() {
            qc.registerQueue('hello-darling');
            qc.channel({
                name: 'TEST',
                input: 'hello-darling',
                output: 'ciao'
            });
        }).should.throw('Queue "ciao" is not declared');
        (function() {
            qc.registerQueue('hello-sweetie');
            qc.registerQueue('hello-honey');
            qc.channel({
                name: 'TEST',
                input: 'hello-sweetie',
                output: 'hello-honey'
            });
        }).should.not.throw();
    });
});
