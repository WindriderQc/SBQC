const request = require('supertest');
const { expect } = require('chai');

describe('API Endpoint Tests', function() {
    this.timeout(5000);

    it('should return a 200 OK status and HTML for the home page', (done) => {
        request(global.testServer)
            .get('/')
            .expect('Content-Type', /html/)
            .expect(200, done);
    });

    it('should return a 200 OK status and HTML for the ISS Detector page', (done) => {
        request(global.testServer)
            .get('/iss-detector')
            .expect('Content-Type', /html/)
            .expect(200, done);
    });
});