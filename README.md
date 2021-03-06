# Martinet

Distributed task management.

Martinet is a database-backed, zeroMQ-based distributed task management system. It is persistent with respect to future and recurring tasks, so if your system goes down, those tasks will be unaffected. Martinet can use any [sequelize.js](github.com/sequelize/sequelize) compatible database as its backing database (SQLite is used by default).

Martinet uses a push-pull messaging pattern to ensure efficiency when used in a distributed environment.

## Installation

`npm install martinet`


## Usage

This library is divided into two parts: the `Martinet` object, which
handles dispatching and scheduling tasks, and the `Worker` object
which receives said tasks and defines the actions to take upon being
given certain tasks.

### Martinet


#### Setup

```javascript
var Martinet = require('martinet');

var martinet = new Martinet();

// Martinet allows you to create multiple workers
// so that you can keep worker code in separate 
// logical modules.

martinet.addWorker('WORKER_NAME_1', 'WORKER_PORT_1');
martinet.addWorker('WORKER_NAME_2', 'WORKER_PORT_2');

```

#### Creating Tasks

##### Execute a task immediately

```javascript

martinet.execute({
    worker: 'WORKER_NAME',
    name: 'task_name',
    description: 'Do a thing' // Used in the backend so it's easier to lookup tasks later
}, args);

// args JSON object of named arguments, so like
// {
//    thing_id: 1   
// }
//
// this object gets serialized and passed to the Worker
//

```

##### Execute a task in the future

```javascript

martinet.schedule('in 20 minutes', {
    worker: 'WORKER_NAME',
    name: 'task_name',
    description: 'Do a thing in 20 minutes'
}, args);

```

##### Create a recurring task

```javascript

martinet.every('30 minutes', {
    worker: 'WORKER_NAME',
    name: 'task_name',
    description: 'Do a thing every half hour',
    run_at: 'midnight' // optional time to start the recurring task
}, args);

```

### Workers


#### Setup

```javascript

var MartinetWorker = require('martinet').Worker;

var WORKER_PORT = 3000;
var worker = new MartinetWorker(WORKER_PORT, {
    martinet_url: '127.0.0.1',
    martinet_port: '8089'
});
```

#### Defining Tasks


```javascript

worker.on('task_name', function(taskId, data, callback) {
    // do a thing.
    
    // if it's successful, callback(),
    // if there's an error, callback(err)

});

```

## Options

### Martinet

#### Port

Custom port for martinet's pull socket to listen on.

```javascript
var Martinet = require('martinet');

var options = {
    port: 8009
};

var martinet = new Martinet(options);
```

#### DB

Connection information to the backing database. Uses [sequelize.js options](http://sequelizejs.com/docs/1.7.8/usage#options).

default is 


```javascript
var Martinet = require('martinet');

var options = {
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

var martinet = new Martinet(options);
```

but for example to use postgres:

```javascript
var Martinet = require('martinet');

var options = {
    db: {
      database: 'martinet-db',
      username: process.env.USER,
      password: null,
      options: {
        dialect: 'postgres',
        port: 5432,
        host: 'database.host'
        logging: false,
        omitNull: true
      },
      sync: true
    }
};

var martinet = new Martinet(options);
```

### Worker

#### Martinet URL

Connection string to connect to martinet. If worker is on the same machine as martinet, this should be 127.0.0.1 

#### Martinet PORT

The port to connect to martinet on. This should be the same port defined by the martinet object's port option.
