const router = require('express').Router();
const mailman = require('../public/js/mailman');
const dataApiService = require('../services/dataApiService');
const weatherService = require('../services/weatherService');

// Weather and Air Quality
router.get('/weather/:latlon', async (req, res) => {
    try {

        const [lat, lon] = req.params.latlon.split(',');
        const data = await weatherService.getWeatherAndAirQuality(lat, lon);
        res.json(data);

    } catch (error) {
        console.error('Error in /weather route:', error);
        res.status(500).json({ status: "error", message: 'Failed to fetch weather or air quality data', details: error.message });
    }
});

// Tides
router.get('/tides', async (req, res) => {

    try {
        const { lat, lon, days } = req.query;
        if (!lat || !lon || !days) {
            return res.status(400).json({ error: 'Missing required query parameters: lat, lon, days.' });
        }
        const data = await weatherService.getTides(lat, lon, days);
        res.json(data);

    } catch (error) {
        console.error('Error fetching tide data:', error);
        res.status(500).json({ status: "error", message: 'Server error while fetching tide data', details: error.message });
    }
});

// Geolocation
router.get('/proxy-location', async (req, res) => {
    try {
        const data = await weatherService.getGeolocation();
        res.json(data);

    } catch (error) {
        console.error('Error in /proxy-location route:', error);
        res.status(500).json({ status: "error", message: 'Error fetching geolocation', details: error.message });
    }
});

// Alert
router.post('/alert', async (req, res) => {
    const { dest, msg, image64 } = req.body;
    try {
        await mailman.sendEmail(dest, msg, image64);
        res.status(200).send("Alert processed");

    } catch (error) {
        console.error("Error sending email alert:", error);
        res.status(500).json({ status: "error", message: "Failed to process alert", details: error.message });
    }
});

// Get Latest Device Data
router.get('/deviceLatest/:esp', async (req, res) => {
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
        console.error('Error retrieving latest device data for ESP:', req.params.esp, err);
        const statusCode = err.response ? err.response.status : 500;
        res.status(statusCode).json({ status: "error", message: "Server error retrieving latest device data." });
    }
});

// Save Profile
router.post('/saveProfile', async (req, res) => {
    if (!req.session || !req.session.userToken) {
        return res.status(401).json({ status: "error", message: "Unauthorized: No session token." });
    }

    try {
        const { profileName, config } = req.body;
        await dataApiService.saveProfile(profileName, config, req.session.userToken);
        res.send('Profile saved successfully!');
    } catch (err) {
        console.error('Error saving profile:', err);
        res.status(500).send(`Error saving profile: ${err.message}`);

    }
});

// Get Sampled Device Data
router.get('/data/:options', async (req, res) => {
    if (!req.session || !req.session.userToken) {

        return res.status(401).json({ error: "Unauthorized: No session token." });
    }
    try {
        const [samplingRatio, espID, dateFrom] = req.params.options.split(',');
        if (req.session) req.session.selectedDevice = espID;
        const data = await dataApiService.getDeviceData(samplingRatio, espID, dateFrom, req.session.userToken);
        res.json(data);

    } catch (err) {
        console.error('Error fetching data in /data/:options route:', err);
        res.status(500).json({ status: "error", message: "Could not get data", details: err.message });
    }
});

// TLE Data
router.get('/tle', async (req, res) => {

    try {
        const data = await weatherService.getTLE();
        res.type('text/plain').send(data);

    } catch (error) {
        console.error('Error fetching TLE data:', error);
        res.status(500).json({ status: "error", message: 'Unable to fetch TLE data', details: error.message });
    }
});

// Barometric Pressure
router.get('/pressure', async (req, res) => {
    const { lat, lon, days: daysStr } = req.query;
    if (!lat || !lon) {
        return res.status(400).json({ status: "error", message: 'Missing required query parameters: lat, lon.' });
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

    try {
        const result = await weatherService.getPressure(lat, lon, numDaysHistorical);
        res.json({
            message: `Aggregated pressure and temperature data for lat: ${lat}, lon: ${lon}`,
            ...result,
            requested_historical_days: numDaysHistorical,

        });
    } catch (error) {

        console.error(`Critical error in /api/pressure route for ${lat},${lon}. Message: ${error.message}`);
        res.status(500).json({
            error: 'Failed to retrieve pressure data, and mock data generation also failed.',
            details: error.message,

        });
    }
});

module.exports = router;