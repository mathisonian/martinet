'use strict';

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('ScheduledTask', {
        'worker': {type: DataTypes.STRING, required: true },
        'name': {type: DataTypes.STRING, required: true },
        'description': {type: DataTypes.STRING, required: true },
        'run_at': {type: DataTypes.BIGINT, required: true },
        'is_recurring': {type: DataTypes.BOOLEAN, required: true, defaultValue: false },
        'interval': {type: DataTypes.INTEGER, required: false }
    }, {
        instanceMethods: {
            addParameter: function(name, value) {
                var TaskParameter = sequelize.import(__dirname + '/task_parameter');

                return TaskParameter.create({
                    name: name,
                    value: value,
                    ScheduledTaskId: this.id
                });
            },

            createTask: function() {
                var Task = sequelize.import(__dirname + '/task');

                return Task.create({
                    worker: this.worker,
                    name: this.name,
                    description: this.description
                });
            },

            getParameters: function() {
                var TaskParameter = sequelize.import(__dirname + '/task_parameter');

                return TaskParameter.findAll({
                    where: {
                        ScheduledTaskId: this.id
                    }
                });
            }
        }
    });
};

