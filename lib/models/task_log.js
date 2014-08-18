'use strict';

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('TaskLog', {
        'content': {type: DataTypes.TEXT, required: true }
    });
};
