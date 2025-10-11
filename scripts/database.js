const { MongoClient } = require('mongodb');

const connectDb = async (uri, dbName) => {
    const client = new MongoClient(uri);
    await client.connect();
    console.log(`MongoDB connected to database: ${dbName} (for sessions only)`);
    return client.db(dbName);
};

const loadCollections = async (db, app) => {
    // SBQC now uses DataAPI for all data operations
    // Local MongoDB is only used for express-session storage
    // Initialize empty collections object to prevent errors
    app.locals.collections = {};
    
    console.log("SBQC is configured to use DataAPI for all data operations.");
    console.log("Local MongoDB connection is only for session storage.");
    console.log('\n__________________________________________________\n\n');
};

module.exports = { connectDb, loadCollections };