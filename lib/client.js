
'use strict';

module.exports = WorkerClient;

var uuid = require('uuid');
var amqplib = require('amqplib');
var when = require('when');

var MAX_PRIORITY = 10;

WorkerClient.CLOSED = 0;
WorkerClient.CONNECTING = 1;
WorkerClient.READY = 2;

function WorkerClient(app) {
    this.app = app;
    this.compound = app.compound;
    this.connection = null;
    this.channel = null;
    this.replyQueue = null;
    this.jobResults = null;
    this.readyState = WorkerClient.CLOSED;
    this._awaitingResponseHandlers = Object.create(null);
    this._awaitingConnectionPool = [];
    this._channels = Object.create(null);
}

WorkerClient.prototype.connect = function () {
    var workerClient = this;

    workerClient.readyState = WorkerClient.CONNECTING;

    return amqplib
        .connect('amqp://localhost')
        .then(function(connection) {
            workerClient.connection = connection;
            return workerClient.connection.createChannel();
        })
        .then(function(channel) {
            return workerClient.registerChannel(channel);
        })
        .then(function() {
            workerClient.readyState = WorkerClient.READY;
            return when.all(workerClient._awaitingConnectionPool.map(function(f) {
                return f();
            }));
        });

};

WorkerClient.prototype.registerChannel = function(channel) {
    var workerClient = this;
    if (workerClient.channel) {
        throw new Error('Undisposed channel detected');
    }
    workerClient.channel = channel;
    channel.on('error', function(err) {
        console.log('got error', err);
        workerClient.compound.sendError(err);
    });
    channel.on('close', function() {
        delete workerClient.channel;
        workerClient.readyState = WorkerClient.CLOSED;
    });
    var assertedOutputs = {};
    return when.all(Object.keys(workerClient._channels).map(function(n) {
        var ch = workerClient._channels[n].channelDescriptor;
        if (!(ch.output in assertedOutputs)) {
            assertedOutputs[ch.output] = true;
            return assertQueueWithHandler(ch.output, ch);
        }
    }).filter(Boolean));

    function assertQueueWithHandler(name, ch) {
        return workerClient.channel
            .assertQueue(name, {exclusive: name ? false : true})
            .then(function(qok) {
                ch.outputQueueId = qok.queue;
                workerClient.channel.consume(qok.queue, handleResult, {noAck: true});
            });

        function handleResult(msg) {
            var fullCorrelationId = msg.properties.correlationId.split('#');
            var handler = workerClient._channels[fullCorrelationId[0]];
            var fn = workerClient._awaitingResponseHandlers[fullCorrelationId[1]];
            var data = JSON.parse(msg.content.toString());
            setImmediate(function() {
                if (handler && handler.hook) {
                    handler.hook.call(workerClient, data.err, data.result, fn || function(){});
                } else if (fn) {
                    fn(data.err, data.result);
                }
            });
        }
    }
};

WorkerClient.prototype._send = function (message, priority) {
    var workerClient = this;
    return new when.Promise(function(resolve, reject) {
        var corrId = uuid.v4();
        var fullCorrelationId = message.name + '#' + corrId;
        var handlerQueue = workerClient._channels[message.name];
        if (!handlerQueue) {
            console.log('no remote call', message.name, Object.keys(workerClient._channels));
            return reject(new Error('Remote call not registered'));
        }
        var queue = handlerQueue.channelDescriptor.input;

        message = JSON.stringify(message);

        console.log(' [wc] send to queue (%s), will reply to %s', queue, handlerQueue.channelDescriptor.outputQueueId);

        workerClient.channel.sendToQueue(queue, new Buffer(message), {
            correlationId: fullCorrelationId,
            replyTo: handlerQueue.channelDescriptor.outputQueueId,
            priority: handlerQueue.channelDescriptor.maxPriority - priority
        });

        if (!handlerQueue.channelDescriptor.output) {
            workerClient._awaitingResponseHandlers[corrId] = function(err, res) {
                delete workerClient._awaitingResponseHandlers[corrId];
                corrId = null;
                if (err) {
                    return reject(err);
                }
                resolve(res);
            };
        } else {
            resolve({scheduled: corrId});
        }
    });
};

WorkerClient.prototype.callRemote = function(name, priority, args) {
    var client = this;
    if (client.readyState === WorkerClient.READY) {
        return send();
    } else {
        return new when.Promise(function(resolve, reject) {
            if (client.readyState === WorkerClient.CLOSED) {
                client.connect().catch(reject);
            }
            client._awaitingConnectionPool.push(function() {
                return send().then(resolve, reject);
            });
        });
    }
    function send() {
        return client._send({name: name, args: args}, priority || 0);
    }
};

WorkerClient.prototype.addHandler = function(channelDescriptor, hook) {
    this._channels[channelDescriptor.name] = {
        channelDescriptor: channelDescriptor,
        hook: hook
    };
    var wc = this;
    return function(args, priority) {
        return wc.callRemote(channelDescriptor.name, priority, args);
    };
};

