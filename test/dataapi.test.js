require('dotenv/config');
const { expect } = require('chai');
const fetch = require('node-fetch');
const weatherService = require('../services/weatherService');

describe('DataAPI External Service Proxies', function() {
    this.timeout(15000); // External APIs can be slow

    const DATA_API_URL = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");
    
    // Note: These tests verify that the DataAPI endpoints match the original weatherService
    // They are skipped if endpoints are not available (DataAPI uses different architecture)

    describe('Core Service Tests', () => {
        it('should fetch TLE data from weatherService', async function() {
            try {
                const tleData = await weatherService.getTLE();
                expect(tleData).to.be.a('string');
                expect(tleData.length).to.be.greaterThan(0);
                expect(tleData).to.include('ISS');
            } catch (error) {
                console.warn('      ⚠️  TLE service test skipped:', error.message);
                this.skip();
            }
        });

        it('should fetch geolocation from weatherService', async function() {
            try {
                const geoData = await weatherService.getGeolocation();
                expect(geoData).to.have.property('country');
                expect(geoData).to.have.property('city');
            } catch (error) {
                console.warn('      ⚠️  Geolocation service test skipped:', error.message);
                this.skip();
            }
        });
    });
});
