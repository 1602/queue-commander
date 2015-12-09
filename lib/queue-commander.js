
'use strict';

// imports
var ChannelDescriptor = require('./channel-descriptor.js');
var Server = require('./server.js');
var Queue = require('./queue.js');
var Client = require('./client.js');
var when = require('when');
var request = require('request');

// exports
module.exports = QueueCommander;

function QueueCommander(settings) {
    this.settings = settings || {};
    this.settings.host = this.settings.host || 'localhost';
    this.descriptors = [];
    this.client = null;
    this.server = null;
    this.queues = [];
}

QueueCommander.prototype.channel = function(opts) {
    var d = new ChannelDescriptor(opts, this);
    this.ensureQueue(opts.input, opts.output);
    this.descriptors.push(d);
    return d;
};

QueueCommander.prototype.ensureQueue = function(i, o) {
    var qc = this;
    [i, o].filter(Boolean).forEach(function(queueName) {
        if(!qc.getQueueByName(queueName)) {
            throw new Error('Queue "' + queueName + '" is not declared');
        }
    });
};

QueueCommander.prototype.getQueueByName = function(queueName) {
    var found;
    this.queues.forEach(function(q) {
        if (q.name === queueName) {
            found = q;
        }
    });
    return found;
};

QueueCommander.prototype.registerQueue = function(name, settings) {
    var q = this.getQueueByName(name);
    if (q) {
        throw new Error('Queue "' + name + '" already registered');
    }
    this.queues.push(new Queue(name, settings, this));
};

QueueCommander.prototype.getRealQueueName = function(name) {
    var prefix = this.settings.prefix || '';
    if (name) {
        return prefix + name;
    }
    return '';
};

QueueCommander.prototype.getClient = function() {
    if (!this.client) {
        this.client = new Client(this);
    }
    return this.client;
};

QueueCommander.prototype.getServer = function() {
    if (!this.server) {
        this.server = new Server(this);
    }
    return this.server;
};

QueueCommander.prototype.canConsumeJobResults = function() {
    return this.settings.consumeJobResults !== false; // defaults to true
};

QueueCommander.prototype.loadQueueStats = function() {
    var args = [].join.call(arguments, ',');
    var url = 'http://guest:guest@localhost:15672/api/queues?columns=name,' + args;
    var registeredQueues = this.queues;

    return new when.Promise(function(resolve, reject) {
        request({url: url}, function (error, response, body) {
            if (error) {
                return reject(error);
            }

            var queues = JSON.parse(body);
            var queueStat = queues.filter(function(s) {
                return registeredQueues.some(function(known) {
                    return s.name === known.getName();
                });
            });

            resolve(queueStat);
        });
    });
};

QueueCommander.prototype.getQueuesLength = function() {
    var qc = this;
    var prefix = this.settings.prefix || '';
    var queueNames = [].slice.call(arguments).map(function(n) {
        return qc.getRealQueueName(n);
    });
    return this.loadQueueStats('messages').then(function(queues) {
        return queues.filter(function(q) {
            return queueNames.indexOf(q.name) > -1;
        }).reduce(function(result, q) {
            var name = q.name;
            if (prefix && name.indexOf(prefix) === 0) {
                name = name.substr(prefix.length);
            }
            result[name] = q.messages;
            return result;
        }, {});
    });
};

