// SBQC Service Endpoints
// These are SBQC's internal service endpoints, not to be confused with DataAPI
// DataAPI (external) handles: users, devices, heartbeats, alarms, profiles
// SBQC endpoints (here) handle: weather, tides, geolocation, device queries
const router = require('express').Router();
const mailman = require('../public/js/mailman');
const dataApiService = require('../services/dataApiService');
const weatherService = require('../services/weatherService');
const { BadRequest } = require('../utils/errors');

// Get auth middleware from nodeTools (already configured in sbqc_serv.js)
const nodetools = require('nodetools');
const auth = nodetools.auth.createAuthMiddleware({
    dbGetter: (req) => req.app.locals.db,
    loginRedirectUrl: 'https://data.specialblend.ca/login'
});

// Weather and Air Quality
router.get('/weather/:latlon', async (req, res, next) => {
    try {
        const [lat, lon] = req.params.latlon.split(',');
        const data = await weatherService.getWeatherAndAirQuality(lat, lon);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Tides
router.get('/tides', async (req, res, next) => {
    try {
        const { lat, lon, days } = req.query;
        if (!lat || !lon || !days) {
            throw new BadRequest('Missing required query parameters: lat, lon, days.');
        }
        const data = await weatherService.getTides(lat, lon, days);
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Geolocation
router.get('/proxy-location', async (req, res, next) => {
    try {
        const data = await weatherService.getGeolocation();
        res.json(data);
    } catch (error) {
        next(error);
    }
});

// Alert
router.post('/alert', async (req, res, next) => {
    const { dest, msg, image64 } = req.body;
    try {
        await mailman.sendEmail(dest, msg, image64);
        res.status(200).send("Alert processed");
    } catch (error) {
        next(error);
    }
});

// Get Latest Device Data - Public endpoint for IoT monitoring
router.get('/deviceLatest/:esp', async (req, res, next) => {
    try {
        const respData = await dataApiService.getDeviceLatest(req.params.esp);
        const data = respData.data && respData.data[0];
        if (!data) {
            return res.json({ status: "info", message: 'No latest post found for this device.', data: null });
        }
        res.json({ status: "success", message: "Latest post retrieved", data: data });
    } catch (err) {
        next(err);
    }
});


// Get latest post for all devices - Public endpoint for dashboard
router.get('/devices/latest-batch', async (req, res, next) => {
    try {
        const latestData = await dataApiService.getLatestForAllDevices();
        res.json(latestData);
    } catch (err) {
        next(err);
    }
});



// Save Profile - Protected (configuration management)
// TODO: Consider migrating to DataAPI frontend
router.post('/saveProfile', auth.requireAuth, async (req, res, next) => {
    try {
        const { profileName, config } = req.body;
        // User is guaranteed to be logged in - session cookies handle auth
        await dataApiService.saveProfile(profileName, config);
        res.send('Profile saved successfully!');
    } catch (err) {
        next(err);
    }
});

// Get Device Data - Public endpoint for graphs and visualization
router.get('/data/:options', async (req, res, next) => {
    try {
        const [samplingRatio, espID, dateFrom] = req.params.options.split(',');
        if (req.session) req.session.selectedDevice = espID;
        const data = await dataApiService.getDeviceData(samplingRatio, espID, dateFrom);
        res.json(data);
    } catch (err) {
        next(err);
    }
});

// TLE Data
router.get('/tle', async (req, res, next) => {
    try {
        const data = await weatherService.getTLE();
        res.type('text/plain').send(data);
    } catch (error) {
        next(error);
    }
});

// Barometric Pressure
router.get('/pressure', async (req, res, next) => {
    try {
        const { lat, lon, days: daysStr } = req.query;
        if (!lat || !lon) {
            throw new BadRequest('Missing required query parameters: lat, lon.');
        }

        let numDaysHistorical = 2; // Default
        if (daysStr) {
            const parsedDays = parseInt(daysStr, 10);
            if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 5) {
                numDaysHistorical = parsedDays;
            } else {
                console.warn(`Invalid 'days' parameter: ${daysStr}. Defaulting to ${numDaysHistorical} days.`);
            }
        }

        const result = await weatherService.getPressure(lat, lon, numDaysHistorical);
        res.json({
            message: `Aggregated pressure and temperature data for lat: ${lat}, lon: ${lon}`,
            ...result,
            requested_historical_days: numDaysHistorical,
        });
    } catch (error) {
        next(error);
    }
});

// ISS Data - Proxied from DataAPI
router.get('/iss', async (req, res, next) => {
    try {
        const issData = await dataApiService.getIssData();
        // DataAPI returns: { status: "success", message: "...", meta: { total }, data: [...] }
        // Forward it directly to the client
        res.json(issData);
    } catch (error) {
        console.error('Error fetching historical ISS data from DataAPI:', error);
        next(error);
    }
});

module.exports = router;