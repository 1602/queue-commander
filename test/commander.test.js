
'use strict';

var QC = require('../');
var should = require('./');
var when = require('when');

describe('commander', function() {

    it('should register queue with name and settings', function(){
        var qc = new QC({prefix: 'test_'});
        qc.registerQueue('test-queue');
        qc.registerQueue('another-test-queue', {durable: true});
        qc.queues.should.have.lengthOf(2);
        qc.queues[0].name.should.equal('test-queue');
        should.not.exist(qc.queues[0].settings);
        qc.queues[1].name.should.equal('another-test-queue');
        qc.queues[1].settings.durable.should.be.true;
    });

    it('should not allow creating channel without registering a queue', function() {
        var qc = new QC({prefix: 'test_'});
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

    it('should load queue stats', function() {
        var qc = new QC({prefix: 'test_'});
        qc.registerQueue('durga');
        qc.registerQueue('output');
        return qc.loadQueueStats('messages').then(function(res) {
            console.log(res);
            should.exist(res);
            res.should.have.lengthOf(2);
            res[0].name.should.equal('test_durga');
            res[0].messages.should.equal(0);
            res[1].name.should.equal('test_output');
            res[1].messages.should.equal(0);
        });
    });

    it('should not allow consuming jobs when consumeJobResults=false', function(done) {
        var called1 = 0;
        var called2 = 0;

        var connect = schema({prefix: 'test_'}, true);
        var ch1 = schema({prefix: 'test_', consumeJobResults: false});
        var ch2 = schema({prefix: 'test_', consumeJobResults: true});

        function schema(settings, isServer) {
            var qc = new QC(settings);
            qc.registerQueue('durga', {durable: false, noAck: true});
            qc.registerQueue('output', {durable: false, noAck: true});
            var ch = qc.channel({
                name: 'TEST',
                input: 'durga',
                output: 'output'
            });
            if (isServer) {
                ch.onServer(function(args, done) {
                    done();
                });
                return qc.getServer().connect();
            } else {
                return ch;
            }
        }

        var task1 = ch1.onClient(function fastHook(err, res, next) {
            called1 += 1;
            console.log('called 1');
            next();
        });
        var task2 = ch2.onClient(function slowHook(err, res, next) {
            setTimeout(function() {
                called2 += 1;
                next();
                if (called2 === 2) {
                    called1.should.equal(0);
                    done();
                }
            }, 100);
        });
        connect.then(function() {
            task1();
            task2();
        });
    });

    it.skip('should load given queues sizes', function(done) {
        var qc = new QC({prefix: 'test_'});
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
