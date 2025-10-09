require('dotenv').config();
const fetch = require('node-fetch');
const { isEqual } = require('lodash');

// Import original services
const weatherService = require('./services/weatherService');
const issService = require('./services/issService');
// We will need to mock the database for services that depend on it.
// For now, we will focus on services that don't have db dependencies.

const DATA_API_URL = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");

async function verifyEndpoints() {
    console.log('Starting DataAPI verification...\n');

    // --- Verification Tests ---

    // Example: Verify TLE Data
    await verify(
        'TLE Data',
        () => weatherService.getTLE(),
        () => fetch(`${DATA_API_URL}/tle`).then(res => res.text())
    );

    // Example: Verify Geolocation
    // Note: This might have slight variations depending on server IP, so a simple equality check might fail.
    // For now, we'll check for the presence of key fields.
    await verify(
        'Geolocation Data',
        () => weatherService.getGeolocation(),
        () => fetch(`${DATA_API_URL}/geolocation`).then(res => res.json()),
        (original, newData) => {
            return original.country && newData.country && original.city && newData.city;
        }
    );

    // --- Weather and Tides ---
    const TEST_LAT = '46.81';
    const TEST_LON = '-71.20';
    const TEST_DAYS = '3';

    await verify(
        'Weather and Air Quality',
        () => weatherService.getWeatherAndAirQuality(TEST_LAT, TEST_LON),
        () => fetch(`${DATA_API_URL}/weather?lat=${TEST_LAT}&lon=${TEST_LON}`).then(res => res.json()),
        (original, newData) => {
            const originalWeatherOk = original.weather && original.weather.main;
            const newWeatherOk = newData.weather && newData.weather.main;
            const originalAqOk = original.air_quality && original.air_quality.results;
            const newAqOk = newData.air_quality && newData.air_quality.results;
            return originalWeatherOk && newWeatherOk && originalAqOk && newAqOk;
        }
    );

    await verify(
        'Tides Data',
        () => weatherService.getTides(TEST_LAT, TEST_LON, TEST_DAYS),
        () => fetch(`${DATA_API_URL}/tides?lat=${TEST_LAT}&lon=${TEST_LON}&days=${TEST_DAYS}`).then(res => res.json()),
        (original, newData) => {
            const originalOk = original.heights || original.error;
            const newOk = newData.heights || newData.error;
            return !!originalOk && !!newOk;
        }
    );

    await verify(
        'Barometric Pressure Data',
        () => weatherService.getPressure(TEST_LAT, TEST_LON, 2),
        () => fetch(`${DATA_API_URL}/pressure?lat=${TEST_LAT}&lon=${TEST_LON}&days=2`).then(res => res.json()),
        (original, newData) => {
            const originalOk = original.readings && Array.isArray(original.readings);
            const newOk = newData.readings && Array.isArray(newData.readings);
            return originalOk && newOk;
        }
    );

    // --- Database-dependent tests ---
    const { connectDb, loadCollections } = require('./scripts/database');
    const express = require('express');

    const app = express();
    app.locals = {};

    try {
        const testMongoUri = process.env.MONGO_CLOUD.replace('/sbqc', '/test_sbqc');
        const db = await connectDb(testMongoUri, 'test_sbqc');
        await loadCollections(db, app);

        await verify(
            'ISS Data',
            () => issService.getIssData(app.locals.collections.isses),
            () => fetch(`${DATA_API_URL}/iss`).then(res => res.json()),
            (original, newData) => {
                return Array.isArray(original) && Array.isArray(newData.data);
            }
        );

        // Meows
        await verify(
            'Meows Data',
            () => app.locals.collections.mews.find({}).toArray(),
            () => fetch(`${DATA_API_URL}/meows`).then(res => res.json()),
            (original, newData) => Array.isArray(original) && Array.isArray(newData.mews)
        );

        // User Logs
        await verify(
            'User Logs Data',
            () => app.locals.collections.userLogs.find({}).toArray(),
            () => fetch(`${DATA_API_URL}/logs/user`).then(res => res.json()),
            (original, newData) => Array.isArray(original) && Array.isArray(newData.logs)
        );

        // Server Logs
        await verify(
            'Server Logs Data',
            () => app.locals.collections.server.find({}).toArray(),
            () => fetch(`${DATA_API_URL}/logs/server`).then(res => res.json()),
            (original, newData) => Array.isArray(original) && Array.isArray(newData.logs)
        );

        await db.client.close();
    } catch (error) {
        console.error('❌ ERROR during database-dependent verification:', error.message);
    }

    console.log('\nVerification complete.');
}

async function verify(testName, originalFn, newFn, comparisonFn = isEqual) {
    console.log(`--- Verifying: ${testName} ---`);
    try {
        const [originalResult, newResult] = await Promise.all([
            originalFn(),
            newFn()
        ]);

        if (comparisonFn(originalResult, newResult)) {
            console.log('✅ PASS: Results match.');
        } else {
            console.error('❌ FAIL: Results are different.');
            console.log('Original:', JSON.stringify(originalResult, null, 2));
            console.log('DataAPI:', JSON.stringify(newResult, null, 2));
        }
    } catch (error) {
        console.error(`❌ ERROR during verification: ${error.message}`);
    }
    console.log('--- End --- \n');
}

verifyEndpoints();