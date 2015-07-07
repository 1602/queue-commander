
'use strict';

module.exports = WorkerServer;

var amqplib = require('amqplib');

var HANDLER_NOT_REGISTERED_ERR = 'Handler not registered';

function WorkerServer(commander) {
    this.commander = commander;
    this.handlers = Object.create(null);
}

WorkerServer.prototype.connect = function () {
    var workerServer = this;

    workerServer.connectPromise = workerServer.connectPromise ||
        amqplib
        .connect('amqp://localhost')
        .then(function(connection) {
            workerServer.connection = connection;
            return workerServer.connection.createChannel();
        })
        .then(function(channel) {
            if (workerServer.channel) {
                throw new Error('Undisposed channel detected');
            }
            workerServer.channel = channel;
            channel.on('error', function(err) {
                // emit error
                console.log(err);
            });
            channel.on('close', function onclosed() {
                delete workerServer.channel;
                delete workerServer.connectPromise;
                console.log(' [ws] channel closed');
                console.log(' [ws] reconnecting in 1 sec');
                setTimeout(function() {
                    workerServer.connect().then(null, onclosed);
                }, 1000);
            });
            channel.prefetch(1);
            workerServer.commander.descriptors.forEach(function(d) {
                var q = workerServer.commander.getQueueByName(d.input);
                channel.assertQueue(q.name, q.settings);
                channel.consume(q.name, function(message) {
                    workerServer.handle(message);
                });
            });
        })
        .then(function() {
            console.log(' [ws] Awaiting RPC requests');
            return workerServer.channel;
        });

    return workerServer.connectPromise;
};

WorkerServer.prototype.handle = function (message) {
    var workerServer = this;
    var content;

    content = message.content.toString();
    content = JSON.parse(content);

    var handler = this.handlers[content.name];

    if (!handler || 'function' !== typeof handler.handler) {
        console.log(' [ws] No handlers for', content.name, 'known handlers:', Object.keys(this.handlers));
        handler = {handler: function(args, fn) {
            fn(new Error(HANDLER_NOT_REGISTERED_ERR));
        }};
    }

    var didACK = false;

    handler.handler(content.args, function responseCallback(err, result) {
        if (err && err.message === HANDLER_NOT_REGISTERED_ERR) {
            didACK = true;
            console.log(' [ws] nack: unknown handler');
            workerServer.channel.nack(message);
            return;
        }

        var responseJSON = JSON.stringify({err: err, result: result});
        var replyTo = message.properties.replyTo;
        var corrId = message.properties.correlationId;

        if (!didACK) {
            console.log(' [ws] ACK');
            workerServer.channel.ack(message);
        }

        console.log(' [ws] replying to ' + replyTo);
        workerServer.channel.sendToQueue(
            replyTo,
            new Buffer(responseJSON),
            { correlationId: corrId }
        );

    }, function(ack) {
        didACK = true;
        if (ack) {
            console.log(' [ws] ACK');
            workerServer.channel.ack(message);
        } else {
            console.log(' [ws] NACK');
            workerServer.channel.nack(message);
        }
    });
};

WorkerServer.prototype.addHandler = function (channelDescriptor, handler) {
    console.log('added handler for', channelDescriptor.name, channelDescriptor.input, channelDescriptor.output);
    this.handlers[channelDescriptor.name] = {
        channelDescriptor: channelDescriptor,
        handler: handler
    };
};
