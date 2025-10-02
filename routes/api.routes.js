const router = require('express').Router();
const mailman = require('../public/js/mailman');
const dataApiService = require('../services/dataApiService');
const weatherService = require('../services/weatherService');
const { BadRequest } = require('../utils/errors');

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

// Get Latest Device Data
router.get('/deviceLatest/:esp', async (req, res, next) => {
    if (!req.session || !req.session.userToken) {
        return res.status(401).json({ status: "error", message: "Unauthorized: No session token." });
    }
    try {
        const respData = await dataApiService.getDeviceLatest(req.params.esp, req.session.userToken);
        const data = respData.data && respData.data[0];
        if (!data) {
            return res.json({ status: "info", message: 'No latest post found for this device.', data: null });
        }
        res.json({ status: "success", message: "Latest post retrieved", data: data });
    } catch (err) {
        next(err);
    }
});

// Save Profile
router.post('/saveProfile', async (req, res, next) => {
    if (!req.session || !req.session.userToken) {
        return res.status(401).json({ status: "error", message: "Unauthorized: No session token." });
    }
    try {
        const { profileName, config } = req.body;
        await dataApiService.saveProfile(profileName, config, req.session.userToken);
        res.send('Profile saved successfully!');
    } catch (err) {
        next(err);
    }
});

router.get('/iss', async (req, res) => {
    try {
        const response = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        if (!response.ok) {
            throw new Error(`Failed to fetch ISS data: ${response.statusText}`);
        }
        const data = await response.json();
        res.json({ status: "success", data: data });
    } catch (error) {
        console.error('Error fetching ISS data:', error);
        res.status(500).json({ status: "error", message: 'Failed to fetch ISS data', details: error.message });
    }
});

router.get('/data/:options',  async (req, res) => {

    if (!req.session || !req.session.userToken) {
        return res.status(401).json({ error: "Unauthorized: No session token." });
    }
    try {
        const [samplingRatio, espID, dateFrom] = req.params.options.split(',');
        if (req.session) req.session.selectedDevice = espID;
        const data = await dataApiService.getDeviceData(samplingRatio, espID, dateFrom, req.session.userToken);
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

// ISS Data Proxy
router.get('/iss', async (req, res, next) => {
    try {
        const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
        const response = await fetch('https://data.specialblend.ca/iss');
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            res.json(data);
        } else {
            const text = await response.text();
            console.error("Received non-JSON response from ISS endpoint:", text);
            // Sending a 502 Bad Gateway error as this server is acting as a proxy
            res.status(502).json({ error: "Invalid response from upstream ISS data source." });
        }
    } catch (error) {
        next(error);
    }
});

module.exports = router;