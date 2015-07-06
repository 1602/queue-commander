
'use strict';

// imports
var ChannelDescriptor = require('./channel-descriptor.js');
var Server = require('./server.js');
var Client = require('./client.js');

// exports
module.exports = QueueCommander;

function QueueCommander() {
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
    this.queues.push({name: name, settings: settings});
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

