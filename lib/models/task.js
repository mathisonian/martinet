'use strict';

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('Task', {
        'worker': {type: DataTypes.STRING, required: true },
        'name': {type: DataTypes.STRING, required: true },
        'description': {type: DataTypes.STRING, required: true },
        'complete': {type: DataTypes.BOOLEAN, required: true, defaultValue: false },
        'error': {type: DataTypes.BOOLEAN, required: true, defaultValue: false },
        'error_message': {type: DataTypes.TEXT, required: false },
        'progress': {type: DataTypes.DECIMAL, required: false, defaultValue: 0.0 }
    }, {
        instanceMethods: {
            addParameter: function(name, value) {
                var TaskParameter = sequelize.import(__dirname + '/task_parameter');

                return TaskParameter.create({
                    name: name,
                    value: value,
                    taskId: this.id
                });
            }
        }
    });
};
