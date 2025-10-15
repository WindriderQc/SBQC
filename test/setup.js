const app = require('../sbqc_serv.js');
const { connectToTestDB, closeTestDB, cleanupTestDB } = require('./helpers.js');

let server;

// This `before` hook runs once before all tests.
before(async function() {
    // Set a longer timeout for the setup phase, as it involves I/O.
    this.timeout(20000);

    // Start the server on a random, ephemeral port.
    // We wrap this in a promise to wait for it to be ready.
    server = await new Promise(resolve => {
        const s = app.listen(0, () => {
            // Make the server instance available globally for supertest.
            global.testServer = s;
            resolve(s);
        });
    });

    // Connect to the test database.
    await connectToTestDB();
});

// This `after` hook runs once after all tests have completed.
after(async function() {
    this.timeout(10000);

    // Close the server connection.
    if (server) {
        await new Promise(resolve => server.close(resolve));
    }

    // Close the database connection.
    await closeTestDB();
});

// This `afterEach` hook runs after each test.
afterEach(async function() {
    await cleanupTestDB();
});