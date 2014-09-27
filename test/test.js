
var expect = require('expect.js');

var Martinet = require('martinet');
var Worker = Martinet.Worker;
var _ = require('lodash');


describe('martinet tests', function() {

    var martinet, worker;
    var WORKER_PORT = 8010;    

    it('should create a new Martinet object', function(done) {
        martinet = new Martinet();
        expect(martinet).to.be.a(Martinet);
        done();
    });

    
    it('should create a new Worker object', function(done) {
        worker = new Worker(WORKER_PORT);
        expect(worker).to.be.a(Worker);
        done();
    });


    it('should register this worker with martinet', function(done) {
        martinet.addWorker('test-worker', WORKER_PORT);
        expect(martinet.workers).to.have.key('test-worker');
        expect(martinet.workers).to.only.have.keys('test-worker');
        done();
    });

    it('should execute a simple task', function(done) {

        worker.on('add', function(taskId, data, cb) {
            var sum = _.reduce(data.numbers, function(memo, num) { return memo + num; }, 0);
            expect(sum).to.be(21);
            done();
        });

        martinet.execute({
            worker: 'test-worker',
            name: 'add',
            descriptions: 'add some numbers'
        }, {
            numbers: [1, 2, 3, 4, 5, 6]
        });

    });


})