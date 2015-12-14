'use strict';

/**
 * Module dependencies
 */


var zmq  = require('zmq');
var _ = require('lodash');
var humanInterval = require('human-interval');
var Q = require('q');
var date = require('date.js');
var debug = require('debug')('martinet:controller');

function Martinet(options) {
    if (!(this instanceof Martinet)) {
        return new Martinet(options);
    }
    this.socket = zmq.socket('pull');

    var defaults = {
        port: '8009',
        db: {
          database: 'martinet-db',
          username: process.env.USER,
          password: null,
          options: {
            dialect: 'sqlite',
            storage: 'martinet.db',
            logging: false,
            omitNull: true
          },
          sync: true
        }
    };

    this.options = _.defaults(options || {}, defaults);

    var connection = 'tcp://*:' + this.options.port;

    debug('Starting pull socket on ' + connection);
    this.socket.bindSync(connection);

    var models = require('./models');
    this.models = models.setup(this.options.db);

    this.workers = {};
    var self = this;

    this.socket.on('message', function(data) {
        var msg = JSON.parse(data.toString());

        if(msg.set === 'complete') {
            self.setComplete(msg.task);
        } else if(msg.set === 'progress') {
            self.setProgress(msg.task, msg.progress);
        } else if(msg.set === 'error') {
            self.setError(msg.task, msg.error);
        }
    });

    this._start();
}


Martinet.VERSION = require('../package.json').version;
module.exports = Martinet;
module.exports.Worker = require('./worker');


Martinet.prototype.addWorker = function(name, port) {
    // keep a map from worker name -> ZMQ_Client
    var connection = 'tcp://*:' + port;
    var socket = zmq.socket('push');
    socket.bindSync(connection);
    debug('Starting push socket on ' + connection);
    this.workers[name] = {socket: socket, connection: connection};
};


Martinet.prototype.execute = function(taskObj, parameters, cb) {

    // Create a task and then shoot it off
    var Task = this.models.Task;
    var socket = this.workers[taskObj.worker].socket;
    if(!socket) {
        return new Error('Target not found');
    }
    Task.create(taskObj).success(function(task) {
        debug('Dispatching task ' + task.id);
        socket.send(JSON.stringify({id: task.id, name: task.name, data: parameters}));
        cb && cb(null, task.id);
    }).error(function(err) {
        cb && cb(err);
    });
};


Martinet.prototype.schedule = function(when, taskObj, parameters, cb) {
    var ScheduledTask = this.models.ScheduledTask;
    var TaskParameter = this.models.TaskParameter;
    var socket = this.workers[taskObj.worker].socket;

    if(!socket) {
        return new Error('Worker not found');
    }

    ScheduledTask.create(_.extend(taskObj, {
        run_at: (when instanceof Date) ? when : date(when).valueOf()
    })).success(function(task) {
        _.each(parameters, function(value, key) {
            TaskParameter.create({
                name: key,
                value: JSON.stringify(value),
                ScheduledTaskId: task.id
            });
        });
        cb && cb(null, task);
    });
};

Martinet.prototype.every = function(interval, taskObj, parameters, cb) {
    var ScheduledTask = this.models.ScheduledTask;
    var TaskParameter = this.models.TaskParameter;
    var socket = this.workers[taskObj.worker].socket;

    if(!socket) {
        return new Error('Worker not found');
    }

    return ScheduledTask.create(_.extend(taskObj, {
        interval: humanInterval(interval),
        is_recurring: true,
        run_at: (taskObj.run_at) ? date(taskObj.run_at).valueOf() : Date.now().valueOf()
    })).success(function(task) {
        _.each(parameters, function(value, key) {
            TaskParameter.create({
                name: key,
                value: JSON.stringify(value),
                ScheduledTaskId: task.id
            });
        });
        cb && cb(null, task);
    });
};

Martinet.prototype.updateTask = function(taskId, parameters) {
    var TaskParameter = this.models.TaskParameter;

    _.each(parameters, function(val, key) {
        TaskParameter
            .find({
                where: {
                    ScheduledTaskId: taskId,
                    name: key
                }
            }).success(function(param) {
                param
                    .updateAttributes({
                        name: key,
                        value: JSON.stringify(val)
                    });
            });
    });
};

Martinet.prototype.revoke = function(taskId) {
    var TaskParameter = this.models.TaskParameter;
    var ScheduledTask = this.models.ScheduledTask;

    Q.all([
        TaskParameter.destroy({
            ScheduledTaskId: taskId
        }),
        ScheduledTask.destroy({
            id: taskId
        })
    ]).spread(function() {
        debug('Successfully removed task ' + taskId);
    });
};


Martinet.prototype.setProgress = function(taskId, progress) {
    var Task = this.models.Task;
    debug('Task ' + taskId + ' progress ' + 100*progress + '%');
    var self = this;

    Task.find(taskId)
        .success(function(task) {
            task.updateAttributes({
                progress: progress
            }).success(function() {
                if(self._onProgress) {
                    self._onProgress(task);
                }
            }).error(function(err) {
                debug(err);
            });
        }).error(function(err) {
            debug(err);
        });
};


Martinet.prototype.setError = function(taskId, error) {
    debug('Task ' + taskId + ' error: ' + error);
    var Task = this.models.Task;
    var TaskLog = this.models.TaskLog;
    var self = this;

    Task.find(taskId)
        .success(function(task) {
            task.updateAttributes({error: true, error_message: error})
                .success(function() {
                    TaskLog.create({
                        TaskId: taskId,
                        content: error
                    }).success(function(){})
                    .error(function(err) {
                        debug(err);
                    });

                    if(self._onError) {
                        self._onError(task);
                    }
                });
        })
        .error(function(err) {
            debug(err);
        });
};


Martinet.prototype.setComplete = function(taskId) {
    debug('Completed task ' + taskId);
    var Task = this.models.Task;
    var self = this;
    Task.find(taskId)
        .success(function(task) {
            task.updateAttributes({
                complete: true,
                progress: 1.0
            }).success(function() {
                if(self._onComplete) {
                    self._onComplete(task);
                }
            }).error(function(err) {
                debug(err);
            });
        }).error(function(err) {
            debug(err);
        });
};

Martinet.prototype.onComplete = function(f) {
    this._onComplete = f;
};

Martinet.prototype.onError = function(f) {
    this._onError = f;
};

Martinet.prototype.onProgress = function(f) {
    this._onProgress = f;
};


Martinet.prototype._start = function() {
    // what we need to do:
    //

    // periodically watch scheduled tasks and see if they are overdue

    this._scheduledInterval = setInterval(_checkScheduledTasks.bind(this), humanInterval('5 seconds'));
};

Martinet.prototype._stop = function() {
    clearInterval(this._scheduledInterval);
    this._scheduledInterval = undefined;
};


var _checkScheduledTasks = function() {
    var ScheduledTask = this.models.ScheduledTask;
    var self = this;

    ScheduledTask.findAll({
        where: {
            run_at: {
                lte: Date.now().valueOf()
            }
        }
    }).success(function(scheduledTasks) {
        _.each(scheduledTasks, function(scheduledTask) {
            Q.all([
                scheduledTask.createTask(),
                scheduledTask.getParameters()
            ]).spread(function(task, parameters) {
                var socket = self.workers[task.worker].socket;

                var data = {};
                _.each(parameters, function(param) {
                    data[param.name] = JSON.parse(param.value);
                });

                debug('Dispatching task ' + task.id);
                socket.send(JSON.stringify({id: task.id, name: task.name, data: data}));

                // if it was recurring, schedule it again, otherwise destroy it
                if(scheduledTask.is_recurring) {
                    scheduledTask.updateAttributes({
                        run_at: Date.now().valueOf() + scheduledTask.interval
                    });
                } else {
                    scheduledTask.destroy();
                }
            });
        });
    });
};
