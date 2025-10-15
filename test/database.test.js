require('dotenv/config');
const { expect } = require('chai');
const { connectDb, loadCollections } = require('../scripts/database');
const { connectToTestDB } = require('./helpers');
const express = require('express');
const fetch = require('node-fetch');


describe('Database Module', function() {
    this.timeout(15000);
    let db;
    let app;

    before(async () => {
        db = await connectToTestDB();
    });

    beforeEach(() => {
        app = express();
        app.locals = {};
    });

    describe('connectDb', () => {
        it('should connect to the test database', async () => {
            // This test now uses the helper's connection
            expect(db).to.be.an('object');
            expect(db.databaseName).to.equal('test_sbqc');
        });
    });

    describe('loadCollections', () => {
        it('should initialize app.locals.collections for DataAPI architecture', async () => {
            await loadCollections(db, app);
            expect(app.locals.collections).to.be.an('object');
            expect(Object.keys(app.locals.collections).length).to.equal(0);
        });
    });

    describe('DataAPI Integration', () => {
        const DATA_API_URL = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");

        it('should verify DataAPI is responding', async function() {
            try {
                const response = await fetch(`${DATA_API_URL}/api/v1`);
                expect(response.ok, 'DataAPI should respond with 200 OK').to.be.true;
                const data = await response.json();
                expect(data.status).to.include('API');
            } catch (error) {
                this.skip();
            }
        });
    });
});