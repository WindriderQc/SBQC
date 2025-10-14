const { MongoClient } = require('mongodb');

let connection;
let db;

async function connectToTestDB() {
    if (db) {
        return db;
    }

    const testMongoUri = process.env.MONGO_CLOUD.replace('/sbqc', '/test_sbqc');
    const client = new MongoClient(testMongoUri);
    connection = await client.connect();
    db = connection.db('test_sbqc');
    return db;
}

async function closeTestDB() {
    if (connection) {
        await connection.close();
        connection = null;
        db = null;
    }
}

async function cleanupTestDB() {
    if (!db) {
        return;
    }
    const collections = await db.listCollections().toArray();
    for (const collectionInfo of collections) {
        if (collectionInfo.name.startsWith('system.')) {
            continue;
        }
        await db.collection(collectionInfo.name).deleteMany({});
    }
}

module.exports = {
    connectToTestDB,
    closeTestDB,
    cleanupTestDB
};