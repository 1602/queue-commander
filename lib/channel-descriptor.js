
'use strict';

// exports
module.exports = ChannelDescriptor;

function ChannelDescriptor(opts, commander) {
    if (!commander) {
        throw new Error('Commander needed');
    }
    if (!opts) {
        throw new Error('No opts no descriptor');
    }
    if (!opts.input) {
        throw new Error('Channel requires input queue name');
    }
    if (!opts.name) {
        throw new Error('Channel name required');
    }
    this.commander = commander;
    this.name = opts.name;
    this.input = opts.input;
    this.output = opts.output || '';
}

ChannelDescriptor.prototype.onServer = function(fn) {
    if ('function' !== typeof fn) {
        throw new Error('Missing required function');
    }
    return this.commander.getServer().addHandler(this, fn);
};

ChannelDescriptor.prototype.onClient = function(fn) {
    return this.commander.getClient().addHandler(this, fn);
};

