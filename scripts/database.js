const { MongoClient } = require('mongodb');

const connectDb = async (uri, dbName) => {
    const client = new MongoClient(uri);
    await client.connect();
    console.log(`MongoDB connected to database: ${dbName}`);
    return client.db(dbName);
};

const loadCollections = async (db, app) => {
    app.locals.collections = [];
    const collections = await db.listCollections().toArray();

    console.log("Assigning Collections to app.locals:");
    for (const coll of collections) {
        console.log(coll.name);
        app.locals.collections[coll.name] = db.collection(coll.name);
    }

    // The 'boot' collection will be created automatically by MongoDB if it doesn't exist upon the first insertOne operation.
    app.locals.collections.boot = db.collection('boot');
    await app.locals.collections.boot.insertOne({
        logType: 'boot',
        client: 'server',
        content: 'dbServer boot',
        authorization: 'none',
        host: process.env.NODE_ENV === 'production' ? "Production Mode" : "Development Mode",
        ip: 'localhost',
        hitCount: 'N/A',
        created: Date.now()
    });

    // Fetch collection names and document counts
    app.locals.collectionInfo = {};
    for (const coll of collections) {
        const count = await app.locals.collections[coll.name].countDocuments();
        app.locals.collectionInfo[coll.name] = count;
    }
    console.log("Collection Info:", app.locals.collectionInfo, '\n__________________________________________________\n\n');

    // Ensure an `isses` collection reference exists even if the collection wasn't present in the
    // initial listCollections() result. This prevents code that expects
    // `app.locals.collections.isses` from throwing when the collection hasn't been created yet.
    if (!app.locals.collections.isses) {
        app.locals.collections.isses = db.collection('isses');
        try {
            const count = await app.locals.collections.isses.countDocuments();
            app.locals.collectionInfo.isses = count;
        } catch (e) {
            // If the collection does not exist or count fails, set to 0 and continue.
            app.locals.collectionInfo.isses = 0;
        }
    }
};

module.exports = { connectDb, loadCollections };