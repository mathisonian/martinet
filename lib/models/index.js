//'use strict';
// see https://github.com/JeyDotC/articles/blob/master/EXPRESS%20WITH%20SEQUELIZE.md
// for ways to organize this a little better
var models = {};
var fs = require('fs');
var hasSetup = false;
var Sequelize = require('sequelize');
var sequelize = null;

var singleton = function() {

    this.setup = function (config){


        if(hasSetup) {
            return models;
        }

        sequelize = new Sequelize(config.database, config.username, config.password, config.options);

        return init(config.sync);
    };

    this.model = function (name){
        return models[name];
    };

    this.Seq = function (){
        return Sequelize;
    };

    function init(sync) {

        if(sync == null) {
            sync = true;
        }

        models.sequelize = sequelize;

        // Bootstrap models
        fs.readdirSync(__dirname).forEach(function (file) {
            if (~file.indexOf('.js') && file.indexOf('index.js') < 0) {
                var model = sequelize.import(file);
                models[model.name] = model;
            }
        });


        models.TaskParameter.belongsTo(models.Task);
        models.TaskParameter.belongsTo(models.ScheduledTask);

        models.Task.hasMany(models.TaskLog);
        models.TaskLog.belongsTo(models.Task);

        if(sync) {
            sequelize
                .sync();
        }

        hasSetup = true;
        return models;
    }

    if(singleton.caller != singleton.getInstance){
        throw new Error('This object cannot be instantiated');
    }

};

singleton.instance = null;

singleton.getInstance = function() {
    if(this.instance === null) {
        this.instance = new singleton();
    }
    return this.instance;
};

module.exports = singleton.getInstance();