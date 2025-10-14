const request = require('supertest');
const { expect } = require('chai');
const app = require('../sbqc_serv.js'); // Import the app

// A wrapper to close the server after tests
let server;
before(done => {
    // We need to listen on a port for supertest to work.
    // The conditional in sbqc_serv.js prevents it from starting automatically.
    if (!app.listening) {
        server = app.listen(0, done); // Listen on a random free port
    } else {
        server = app;
        done();
    }
});

after(done => {
    if (server) {
        server.close(done);
    } else {
        done();
    }
});


describe('API Endpoint Tests', function() {
    this.timeout(5000);

    it('should return a 200 OK status and HTML for the home page', (done) => {
        request(server)
            .get('/')
            .expect('Content-Type', /html/)
            .expect(200, done);
    });

    it('should return a 200 OK status and HTML for the ISS Detector page', (done) => {
        request(server)
            .get('/iss-detector')
            .expect('Content-Type', /html/)
            .expect(200, done);
    });
});