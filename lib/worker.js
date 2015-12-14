'use strict';

var zmq = require('zmq');
var _ = require('lodash');
var debug = require('debug')('martinet:worker');

function Worker(port, options) {
    if (!(this instanceof Worker)) {
        return new Worker(port, options);
    }

    this.pushSocket = zmq.socket('push');
    this.pullSocket = zmq.socket('pull');

    var defaults = {
        martinet_url: '127.0.0.1',
        martinet_port: '8009'
    };



    this.options = _.defaults(options || {}, defaults);

    var martinetConnection = 'tcp://' + this.options.martinet_url + ':' + this.options.martinet_port;
    var workerConnection = 'tcp://' + this.options.martinet_url + ':' + port;

    debug('Starting push socket on ' + martinetConnection);
    this.pushSocket.connect(martinetConnection);
    debug('Starting pull socket on ' + workerConnection);
    this.pullSocket.connect(workerConnection);

    this.handlers = {};
    var self = this;

    this.pullSocket.on('message', function(data) {
        var msg = JSON.parse(data.toString());

        var handler = self.handlers[msg.name];
        if(handler) {
            self._handle(handler, msg);
        }
    });
}

Worker.VERSION = require('../package.json').version;
module.exports = Worker;

Worker.prototype.on = function(name, f) {
    this.handlers[name] = f;
};


Worker.prototype.setComplete = function(task) {
    this.pushSocket.send(JSON.stringify({task: task, set: 'complete'}));
};

Worker.prototype.setError = function(task, error) {
    this.pushSocket.send(JSON.stringify({task: task, set: 'error', error: error}));
};

Worker.prototype.setProgress = function(task, progress) {
    this.pushSocket.send(JSON.stringify({task: task, set: 'progress', progress: progress}));
};


Worker.prototype._handle = function(handler, task) {
    var self = this;
    handler(task.id, task.data, function(err) {
        if(err) {
            return self.setError(task.id, err);
        }
        self.setComplete(task.id);
    });
};
