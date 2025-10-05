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
            await db.dropDatabase();
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
        it('should load collections and boot data into app.locals', async () => {
            await db.createCollection('test_collection');

            await loadCollections(db, app);

            expect(app.locals.collections).to.have.property('test_collection');
            expect(app.locals.collections).to.have.property('boot');
            expect(app.locals.collectionInfo).to.have.property('test_collection');
            expect(app.locals.collectionInfo.test_collection).to.equal(0);

            const bootRecord = await app.locals.collections.boot.findOne({ client: 'server' });
            expect(bootRecord).to.not.be.null;
            expect(bootRecord.content).to.equal('dbServer boot');
        });
    });
});