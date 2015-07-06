
'use strict';

var should = require('./'),
    QC = require('../'),
    when = require('when');

describe('Client', function() {

    it('should connect on demand and use connection pooling', function(done) {
        var qc = new QC();
        qc.registerQueue('durga', {durable: false});
        var channel = qc.channel({name: 'ECHO', input: 'durga'});
        channel.onServer(function(sound, done) {
            done(null, sound + '-' + sound);
        });
        var call = channel.onClient();
        var client = qc.getClient();
        client.readyState.should.equal(client.constructor.CLOSED);
        qc.getServer().connect().then(function() {
            // two concurrent calls each requires connection and client is disconnected
            when.all([
                call('boo'),
                call('hoo')
            ]).then(function(results) {
                results.should.have.lengthOf(2);
                // assuming FIFO here
                results[0].should.equal('boo-boo');
                results[1].should.equal('hoo-hoo');
                client.channel.close();
                client.readyState.should.equal(client.constructor.READY);
                done();
            }).catch(done);
            client.readyState.should.equal(client.constructor.CONNECTING);
        }).catch(done);
    });

    it('should be able to pick up job result posted by other worker', function(done) {
        var qc1 = new QC();
        var qc2 = new QC();
        qc1.registerQueue('durga', {durable: false});
        qc2.registerQueue('durga', {durable: false});
        var ch1 = qc1.channel({name: 'crawlProduct', input: 'durga'});
        var ch2 = qc2.channel({name: 'crawlProduct', input: 'durga'});
        var server = qc1.getServer();
        var client1 = qc1.getClient();
        var client2 = qc2.getClient();

        ch1.onServer(function(args, done) {
            done(null, args);
        });

        var hook = {
            fn: function(err, result, next) {
                (this === client1).should.be.true;
                next(err, result);
                if (result.foo === 'baz') {
                    client1.channel.close();
                    done();
                }
            }
        };

        var call1 = ch1.onClient(hook.fn);
        var call2 = ch2.onClient(hook.fn);

        server.connect().then(function() {
            when.all([
                call1({foo: 'bar'}),
                call2({foo: 'baz'}).then(function() {
                    client2.channel.reply = null;
                    client2.channel.pending = [];
                    client2.channel.close();
                })
            ]).catch(function(err) {
                should.not.exist(err);
            });
        });

    });

});

