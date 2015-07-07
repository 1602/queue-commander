
'use strict';

var QC = require('../');
var should = require('./');
var when = require('when');

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

    it('should load queue stats', function(done) {
        var qc = new QC();
        qc.registerQueue('durga');
        qc.loadQueueStats('messages').then(function(res) {
            should.exist(res);
            res.should.have.lengthOf(1);
            res[0].name.should.equal('durga');
            res[0].messages.should.equal(0);
            done();
        }, done);
    });

    it.skip('should load given queues sizes', function(done) {
        var qc = new QC();
        qc.registerQueue('x');
        qc.registerQueue('durga', {durable: false});
        var ch1 = qc.channel({name: 'test', input: 'durga', output: 'x'});
        var wait = 4;
        var call1 = ch1.onClient(function() {
            if (--wait === 0) {
                done();
            }
        });
        when.all([call1(), call1(), call1(), call1()]).then(function() {
            console.log(arguments);
            setTimeout(function() {
                qc.getQueuesLength('durga').then(function(res) {
                    console.log(res);
                    //process.exit();
                    ch1.onServer(function(x, done) {
                        setTimeout(function() {
                            done(null, 1);
                        }, 200);
                    });
                    qc.getServer().connect().then(function() {
                    });
                }, done);
            }, 1000);
        });
    });
});
