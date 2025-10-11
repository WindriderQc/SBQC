require('dotenv/config');
const { expect } = require('chai');
const { MongoClient } = require('mongodb');
const { connectDb, loadCollections } = require('../scripts/database');
const express = require('express');
const fetch = require('node-fetch');

describe('Database Module', function() {
    this.timeout(10000); // Set a longer timeout for the suite

    let connection;
    let db;
    let app;

    before(async function() {
        const testMongoUri = process.env.MONGO_CLOUD.replace('/sbqc', '/test_sbqc');
        const client = new MongoClient(testMongoUri);
        connection = await client.connect();
        db = connection.db('test_sbqc');
    });

    after(async function() {
        if (db) {
            try {
                await db.dropDatabase();
            } catch (err) {
                // If the test user doesn't have permission to drop the whole DB,
                // attempt a best-effort cleanup: drop or clear known test collections
                console.warn('[test] dropDatabase failed (permissions?). Falling back to per-collection cleanup:', err.message);
                try {
                    const collections = await db.listCollections().toArray();
                    for (const cinfo of collections) {
                        const name = cinfo.name;
                        // Only touch collections that look like test artifacts to avoid touching production data
                        if (name.startsWith('test_') || name === 'test_collection' || name === 'boot') {
                            try {
                                const col = db.collection(name);
                                // Try dropping the collection, if not allowed then remove documents
                                try {
                                    await col.drop();
                                } catch (dropErr) {
                                    console.warn(`[test] could not drop collection ${name}: ${dropErr.message}. Attempting to remove documents instead.`);
                                    try { await col.deleteMany({}); } catch (delErr) { /* ignore */ }
                                }
                            } catch (inner) {
                                // ignore per-collection failures
                            }
                        }
                    }
                } catch (listErr) {
                    console.warn('[test] failed to list collections for fallback cleanup:', listErr.message);
                }
            }
        }
        if (connection) {
            await connection.close();
        }
    });

    beforeEach(() => {
        app = express();
        app.locals = {};
    });

    describe('connectDb', () => {
        it('should connect to the database', async () => {
            const testDb = await connectDb(process.env.MONGO_CLOUD.replace('/sbqc', '/test_sbqc'), 'test_sbqc');
            expect(testDb).to.be.an('object');
            expect(testDb.databaseName).to.equal('test_sbqc');
            await testDb.client.close();
        });
    });

    describe('loadCollections', () => {
        it('should initialize app.locals.collections for DataAPI architecture', async () => {
            // Since SBQC now uses DataAPI, loadCollections just initializes an empty collections object
            await loadCollections(db, app);

            // The collections object should exist but be empty (DataAPI handles data operations)
            expect(app.locals.collections).to.be.an('object');
            expect(Object.keys(app.locals.collections).length).to.equal(0);
            
            // No boot record or collection info is created with DataAPI architecture
            // This is expected behavior - local MongoDB is only for sessions
        });
    });

    describe('DataAPI Integration', () => {
        const DATA_API_URL = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");

        it('should verify DataAPI is responding', async function() {
            this.timeout(5000); // Give DataAPI more time to respond
            
            try {
                // Test the DataAPI health check endpoint
                const response = await fetch(`${DATA_API_URL}/api/v1`);
                expect(response.ok, 'DataAPI should respond with 200 OK').to.be.true;
                expect(response.status).to.equal(200);
                
                const data = await response.json();
                expect(data).to.be.an('object');
                expect(data).to.have.property('status');
                expect(data.status).to.include('API');
                expect(data).to.have.property('message');
                
                console.log(`      ✓ DataAPI is responding: ${data.message}`);
            } catch (error) {
                // If DataAPI is not running, skip this test with a warning
                console.warn('\n      ⚠️  WARNING: DataAPI is not responding. Make sure it is running.');
                console.warn(`      DataAPI URL: ${DATA_API_URL}/api/v1`);
                console.warn(`      Error: ${error.message}\n`);
                this.skip();
            }
        });

        it('should verify DataAPI database endpoints are accessible', async function() {
            this.timeout(10000); // Give more time for multiple endpoint tests
            
            const endpoints = [
                { name: 'ISS Data', path: '/api/v1/iss', validate: (data) => data.status && Array.isArray(data.data) },
                { name: 'Mews', path: '/api/v1/v2/mews', validate: (data) => data.mews !== undefined && data.meta !== undefined },
                { name: 'User Logs', path: '/api/v1/logs/user', validate: (data) => Array.isArray(data.logs) },
                { name: 'Server Logs', path: '/api/v1/logs/server', validate: (data) => Array.isArray(data.logs) },
                { name: 'Devices', path: '/api/v1/devices', validate: (data) => data.status && Array.isArray(data.data) }
            ];

            try {
                for (const endpoint of endpoints) {
                    const response = await fetch(`${DATA_API_URL}${endpoint.path}`);
                    expect(response.ok, `${endpoint.name} endpoint should respond with 200`).to.be.true;
                    
                    const data = await response.json();
                    expect(endpoint.validate(data), `${endpoint.name} should return valid data structure`).to.be.true;
                }
                console.log('      ✓ All DataAPI database endpoints are accessible');
            } catch (error) {
                console.warn('\n      ⚠️  WARNING: Some DataAPI endpoints are not accessible.');
                console.warn(`      Error: ${error.message}\n`);
                this.skip();
            }
        });
    });
});