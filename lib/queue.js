
'use strict';

module.exports = Queue;

function Queue(name, settings, commander) {
    this.name = name;
    this.settings = settings;
    this.commander = commander;
}

Queue.prototype.getName = function() {
    return this.commander.getRealQueueName(this.name);
};

