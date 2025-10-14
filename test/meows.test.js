const request = require('supertest');
const { expect } = require('chai');
const app = require('../sbqc_serv');

let server;
before(done => {
    if (!app.listening) {
        server = app.listen(0, done);
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


describe('Meows API Routes', function() {
    this.timeout(10000);

    // Skip tests if DataAPI is not available
    before(async function() {
        const fetch = require('node-fetch');
        const DATA_API_URL = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");
        try {
            const response = await fetch(`${DATA_API_URL}/api/v1`);
            if (!response.ok) {
                this.skip();
            }
        } catch (error) {
            this.skip();
        }
    });

    it('GET /meows should return an array of mews', (done) => {
        request(server)
            .get('/meows/mews')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.be.an('array');
                done();
            });
    });

    it('GET /v2/mews should return mews with metadata', (done) => {
        request(server)
            .get('/meows/v2/mews')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.be.an('object');
                expect(res.body).to.have.property('mews').that.is.an('array');
                expect(res.body).to.have.property('meta');
                done();
            });
    });

    it('POST /meows should create a new mew', (done) => {
        const mew = {
            name: 'Test Cat',
            content: 'This is a test meow!'
        };
        request(server)
            .post('/meows/mews')
            .send(mew)
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.be.an('object');
                expect(res.body.data).to.be.an('object');
                expect(res.body.data.name).to.equal(mew.name);
                expect(res.body.data.content).to.equal(mew.content);
                done();
            });
    });

    it('POST /meows should return a 400 for invalid data', (done) => {
        const mew = {
            name: 'Test Cat',
            content: '' // Invalid content
        };
        request(server)
            .post('/meows/mews')
            .send(mew)
            .expect('Content-Type', /json/)
            .expect(400, done);
    });
});