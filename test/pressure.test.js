const request = require('supertest');
const { expect } = require('chai');
const app = require('../sbqc_serv.js');

describe('Pressure API', function() {
    this.timeout(10000); // Increased timeout

    it('should return pressure data with averages', (done) => {
        request(app)
            .get('/api/pressure?lat=45&lon=-73&days=2')
            .expect('Content-Type', /json/)
            .expect(200)
            .end((err, res) => {
                if (err) return done(err);
                expect(res.body).to.have.property('readings');
                expect(res.body).to.have.property('averages');
                expect(res.body.averages).to.have.property('week');
                expect(res.body.averages).to.have.property('month');
                expect(res.body.averages).to.have.property('year');
                // expect(res.body.data_source).to.equal('mock'); // This might be "openweathermap" if keys are present (unlikely here but good to be safe)
                done();
            });
    });
});
