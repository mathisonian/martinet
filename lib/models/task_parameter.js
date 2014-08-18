'use strict';

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('TaskParameter', {
        'name': {type: DataTypes.STRING, required: true },
        'value': {type: DataTypes.TEXT, required: true }
    });
};
