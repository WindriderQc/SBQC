require('dotenv').config();
const fetch = require('node-fetch');

// Import services that still use external APIs (not DataAPI)
const weatherService = require('./services/weatherService');

const DATA_API_URL = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");

async function verifyEndpoints() {
    console.log('DataAPI Endpoint Verification');
    console.log('================================\n');
    console.log('Note: This script verifies DataAPI endpoints are responding correctly.');
    console.log('The migration to DataAPI is complete - local MongoDB is only for sessions.\n');

    // --- External API proxies (TLE, Weather, etc.) ---

    // TLE Data (weatherService fetches from Celestrak, DataAPI should proxy it)
    await verify(
        'TLE Data',
        () => weatherService.getTLE(),
        () => fetch(`${DATA_API_URL}/tle`).then(res => res.text()),
        (original, newData) => typeof original === 'string' && typeof newData === 'string' && original.length > 0 && newData.length > 0
    );

    // Geolocation
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

    // --- DataAPI-only endpoints (no comparison, just verify they respond) ---
    
    await testEndpoint(
        'ISS Data',
        () => fetch(`${DATA_API_URL}/iss`).then(res => res.json()),
        (data) => Array.isArray(data.data) && data.data.length >= 0
    );

    await testEndpoint(
        'Meows Data',
        () => fetch(`${DATA_API_URL}/meows`).then(res => res.json()),
        (data) => Array.isArray(data.mews)
    );

    await testEndpoint(
        'User Logs Data',
        () => fetch(`${DATA_API_URL}/logs/user`).then(res => res.json()),
        (data) => Array.isArray(data.logs)
    );

    await testEndpoint(
        'Server Logs Data',
        () => fetch(`${DATA_API_URL}/logs/server`).then(res => res.json()),
        (data) => Array.isArray(data.logs)
    );

    console.log('\n✅ Verification complete.');
}

async function verify(testName, originalFn, newFn, comparisonFn) {
    console.log(`--- Verifying: ${testName} ---`);
    try {
        const [originalResult, newResult] = await Promise.all([
            originalFn(),
            newFn()
        ]);

        if (comparisonFn(originalResult, newResult)) {
            console.log('✅ PASS: Results match or are valid.');
        } else {
            console.error('❌ FAIL: Results validation failed.');
            console.log('Original type:', typeof originalResult);
            console.log('DataAPI type:', typeof newResult);
        }
    } catch (error) {
        console.error(`❌ ERROR during verification: ${error.message}`);
    }
    console.log('');
}

async function testEndpoint(testName, fetchFn, validationFn) {
    console.log(`--- Testing: ${testName} ---`);
    try {
        const result = await fetchFn();
        
        if (validationFn(result)) {
            console.log('✅ PASS: Endpoint responding correctly.');
        } else {
            console.error('❌ FAIL: Response validation failed.');
            console.log('Response:', JSON.stringify(result, null, 2).substring(0, 500));
        }
    } catch (error) {
        console.error(`❌ ERROR: ${error.message}`);
    }
    console.log('');
}

verifyEndpoints();
