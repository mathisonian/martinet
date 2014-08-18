# Martinet

Distributed task management.

Martinet is a database-backed, zeroMQ-based distributed task management system. It is persistant with respect to future and recurring tasks, so if your system goes down, those tasks will be unaffected. Martinet can use any [sequelize.js](github.com/sequelize/sequelize) compatible database as it's backing database (SQLite is used by default).

Martinet uses a push-pull messaging pattern to ensure efficiency when used in a distrubuted environment.

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
    
    // if its successfull, callback(),
    // if theres an error, callback(err)

});

```
