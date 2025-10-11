require('dotenv/config');
const { expect } = require('chai');
const { MongoClient } = require('mongodb');
const { connectDb, loadCollections } = require('../scripts/database');
const express = require('express');

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
});