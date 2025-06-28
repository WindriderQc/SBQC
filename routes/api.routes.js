const router = require('express').Router();
const fetch = require('node-fetch');
const moment = require('moment');
const getMqtt = require('../scripts/mqttServer').getClient;
const mailman = require('../public/js/mailman');

// TLE Cache
let tleCache = { data: null, timestamp: 0 };
const TLE_CELESTRAK_URL = 'https://celestrak.com/NORAD/elements/stations.txt';
const TLE_CACHE_DURATION_MS = 2 * 60 * 60 * 1000;

// Environment variables
const apiUrl = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");
const WEATHER_API_KEY = process.env.WEATHER_API_KEY; // Used for /weather and /pressure
const API_TIDES_KEY = process.env.API_TIDES_KEY; // Used for /tides
const OPENAQ_API_KEY = process.env.OPENAQ_API_KEY; // Used for /weather (air quality part)

router.get('/weather/:latlon', async (req, res) => {
    const [lat, lon] = req.params.latlon.split(',');
    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&APPID=${WEATHER_API_KEY}`;
    const aq_url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=5000`;

    console.log(`Weather request for: ${lat}, ${lon}`);
    try {
        const weather_response = await fetch(weatherURL);
        if (!weather_response.ok) {
            throw new Error(`Failed to fetch weather data: ${weather_response.statusText}`);
        }
        const weather = await weather_response.json();

        const aq_response = await fetch(aq_url, { headers: { 'X-API-Key': OPENAQ_API_KEY } });
        if (!aq_response.ok) {
            const errorText = await aq_response.text();
            throw new Error(`Failed to fetch air quality data: ${aq_response.statusText} - ${errorText}`);
        }
        const aq_data = await aq_response.json();
        
        let sensorAQData = null;
        if (aq_data.results && aq_data.results.length > 0) {
            const sortedSensors = aq_data.results.sort((a, b) => new Date(b.datetimeLast) - new Date(a.datetimeLast));
            const latestSensor = sortedSensors[0];
            if (latestSensor && latestSensor.id) {
                console.log('Using sensor ID for AQ:', latestSensor.id);
                const sensor_url = `https://api.openaq.org/v3/sensors/${latestSensor.id}`;
                const sensor_response = await fetch(sensor_url, { headers: { 'X-API-Key': OPENAQ_API_KEY } });
                if (sensor_response.ok) {
                    sensorAQData = await sensor_response.json();
                } else {
                    console.warn(`Could not fetch details for sensor ${latestSensor.id}: ${sensor_response.statusText}`);
                }
            }
        }

        res.json({ weather: weather, air_quality: sensorAQData || aq_data }); // Fallback to broader aq_data if specific sensor fails
    } catch (error) {
        console.error('Error in /weather route:', error);
        res.status(500).json({ error: 'Failed to fetch weather or air quality data', details: error.message });
    }
});

router.get('/tides', async (req, res) => {
    const { lat, lon, days } = req.query;
    if (!API_TIDES_KEY) {
        return res.status(500).json({ error: 'Server configuration error: Missing Tides API key.' });
    }
    if (!lat || !lon || !days) {
        return res.status(400).json({ error: 'Missing required query parameters: lat, lon, days.' });
    }
    const worldTidesURL = `https://www.worldtides.info/api/v3?heights&extremes&key=${API_TIDES_KEY}&lat=${lat}&lon=${lon}&days=${days}`;
    try {
        const response = await fetch(worldTidesURL);
        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ error: 'Failed to fetch tide data', details: errorText });
        }
        res.json(await response.json());
    } catch (error) {
        console.error('Error fetching tide data:', error);
        res.status(500).json({ error: 'Server error while fetching tide data', details: error.message });
    }
});

router.get('/proxy-location', async (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log("Client IP for proxy-location:", clientIp); // Added more specific log
    try {
        // First get public IP of the server, as ip-api.com might block local IPs or server's own IP if called directly.
        const ipifyResponse = await fetch('https://api64.ipify.org?format=json');
        if (!ipifyResponse.ok) throw new Error(`ipify error! Status: ${ipifyResponse.status}`);
        const { ip: publicIp } = await ipifyResponse.json();
        console.log("Public IP via ipify:", publicIp);

        const geoResponse = await fetch(`http://ip-api.com/json/${publicIp}`);
        if (!geoResponse.ok) throw new Error(`ip-api.com error! Status: ${geoResponse.status}`);
        res.json(await geoResponse.json());
    } catch (error) {
        console.error('Error in /proxy-location route:', error);
        res.status(500).json({ error: 'Error fetching geolocation', details: error.message });
    }
});

router.post('/alert', async (req, res) => {
    const { dest, msg, image64 } = req.body;
    console.log('Alert request received for:', dest);
    try {
        await mailman.sendEmail(dest, msg, image64); // Assuming sendEmail is async
        res.status(200).send("Alert processed");
    } catch (error) {
        console.error("Error sending email alert:", error);
        res.status(500).send("Failed to process alert");
    }
});

router.get('/deviceLatest/:esp',  async (req, res) => {
    if (!req.session || !req.session.userToken) {
        return res.status(401).json({ status: "error", message: "Unauthorized: No session token."});
    }
    const options = { method: 'GET', headers: { 'auth-token': req.session.userToken }};
    try {
        const response = await fetch(`${apiUrl}/heartbeats/senderLatest/${req.params.esp}`, options);
        const respData = await response.json();
        if (!response.ok) { // Check response.ok for HTTP errors from API
             return res.status(response.status).json({ status: "error", message: respData.message || 'Error from data API', data: null });
        }
        const data = respData.data && respData.data[0];
        if (!data) {
            return res.json({ status: "info", message: 'No latest post found for this device.', data: null  });
        }
        res.json({ status: "success", message: "Latest post retrieved", data: data  });
    } catch (err) {
        console.error('Error retrieving latest device data for ESP:', req.params.esp, err);
        res.status(500).json({ status: "error", message: "Server error retrieving latest device data." });
    }
});

router.post('/saveProfile', async (req, res) => {
    if (!req.session || !req.session.userToken) {
        return res.status(401).send("Unauthorized: No session token.");
    }
    const { profileName, config } = req.body;
    const profileData = { profileName, config };
    const options = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'auth-token': req.session.userToken },
        body: JSON.stringify(profileData)
    };
    try {
        const response = await fetch(`${apiUrl}/profile/${profileData.profileName}`, options);
        const resultText = await response.text(); // Get text first to avoid JSON parse error on non-JSON response
        if (response.ok) {
            res.send('Profile saved successfully!');
        } else {
            console.error('Error saving profile:', resultText);
            res.status(response.status).send(`Error saving profile: ${resultText}`);
        }
    } catch (err) {
        console.error('Error connecting to Data API for saveProfile:', err);
        res.status(500).send(`Error connecting to Data API: ${err.message}`);
    }
});

router.get('/data/:options',  async (req, res) => {
    if (!req.session || !req.session.userToken) {
        return res.status(401).json({ error: "Unauthorized: No session token."});
    }
    const [samplingRatio, espID, dateFrom] = req.params.options.split(',');
    if (req.session) req.session.selectedDevice = espID;

    const options = { method: 'GET', headers: { 'auth-token': req.session.userToken }};
    try {
        const response = await fetch(`${apiUrl}/heartbeats/data/${samplingRatio},${espID},${dateFrom}`, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Data API error: ${response.status} - ${errorText}`);
        }
        res.json(await response.json());
    } catch (err) {
        console.error('Error fetching data in /data/:options route:', err);
        res.status(500).json({ error: "Could not get data", details: err.message });
    }
});

router.get('/tle', async (req, res) => {
    const now = Date.now();
    if (now - tleCache.timestamp < TLE_CACHE_DURATION_MS && tleCache.data) {
        console.log('Serving TLE data from cache.');
        return res.type('text/plain').send(tleCache.data);
    }
    console.log('Fetching new TLE data from Celestrak.');
    try {
        const response = await fetch(TLE_CELESTRAK_URL);
        if (!response.ok) {
            console.error(`Failed to fetch TLE data from Celestrak: ${response.status}`);
            return res.status(response.status).json({ error: 'Failed to fetch TLE data from Celestrak' });
        }
        const data = await response.text();
        tleCache = { data, timestamp: Date.now() };
        console.log('Updated TLE cache.');
        res.type('text/plain').send(data);
    } catch (error) {
        console.error('Error fetching TLE data:', error);
        res.status(500).json({ error: 'Unable to fetch TLE data', details: error.message });
    }
});

// --- Barometric Pressure API Endpoint with Caching & Mock Fallback ---
const pressureAPIResponseCache = {};
const HISTORICAL_PRESSURE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const FORECAST_PRESSURE_CACHE_DURATION = 1 * 60 * 60 * 1000;   // 1 hour

async function fetchAndCacheWeatherData(url, cacheKey, cacheDuration) {
    const cachedEntry = pressureAPIResponseCache[cacheKey];
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < cacheDuration)) {
        console.log(`[Cache HIT] Serving pressure data for key: ${cacheKey}`);
        return cachedEntry.data;
    }
    console.log(`[Cache MISS] Fetching pressure data for key: ${cacheKey} from URL: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`OpenWeatherMap API error for ${url}: ${response.status} - ${errorText}`);
            throw new Error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        pressureAPIResponseCache[cacheKey] = { data, timestamp: Date.now(), duration: cacheDuration };
        console.log(`[Cache STORE] Stored pressure data for key: ${cacheKey}`);
        return data;
    } catch (error) {
        console.error(`Error in fetchAndCacheWeatherData for URL (${url}):`, error.message);
        throw error; 
    }
}

function generateMockPressureTempData(lat, lon, numDaysHistorical = 2, numDaysForecast = 2) {
    console.log(`Generating mock pressure and temperature data for lat: ${lat}, lon: ${lon}, historicalDays: ${numDaysHistorical}, forecastDays: ${numDaysForecast}`);
    const readings = [];
    const now = moment.utc();
    const basePressure = 1012; 
    const pressureVariability = 10;
    const baseTemp = 15; 
    const tempVariability = 5;

    const totalDataPoints = (numDaysHistorical + numDaysForecast) * 24; // Hourly data
    const startTime = moment(now).subtract(numDaysHistorical, 'days').startOf('hour');

    for (let i = 0; i < totalDataPoints; i++) {
        const currentTime = moment(startTime).add(i, 'hours');
        const hourOfYear = currentTime.dayOfYear() * 24 + currentTime.hour(); // For seasonal trend

        const pressure = basePressure +
            (Math.sin(hourOfYear * 2 * Math.PI / (365*24/2)) * (pressureVariability / 2)) + // Slow seasonal wave
            (Math.sin(hourOfYear * 2 * Math.PI / (24*2)) * (pressureVariability / 3)) +    // Faster daily wave
            (Math.random() * pressureVariability / 3 - pressureVariability / 6);          // Noise

        const temp = baseTemp +
            (Math.sin(hourOfYear * 2 * Math.PI / (365*24)) * tempVariability * 2) + // Stronger seasonal temp wave
            (Math.sin(hourOfYear * 2 * Math.PI / 24 + Math.PI) * tempVariability) + // Daily temp wave (coolest early morning)
            (Math.random() * tempVariability / 2 - tempVariability / 4);          // Noise

        readings.push({
            dt: currentTime.unix(),
            pressure: parseFloat(pressure.toFixed(1)),
            temp: parseFloat(temp.toFixed(1))
        });
    }
    // No need to sort as it's generated chronologically.
    // Filter to ensure it doesn't go too far into the future if numDaysForecast is large relative to generation loop
    const forecastEndTime = moment(now).add(numDaysForecast, 'days').endOf('day').unix();
    return readings.filter(r => r.dt <= forecastEndTime && r.dt >= moment(now).subtract(numDaysHistorical, 'days').startOf('day').unix() );
}

router.get('/pressure', async (req, res) => {
    const { lat, lon, days: daysStr } = req.query; // Added daysStr
    let dataSource = "openweathermap";

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Missing required query parameters: lat, lon.' });
    }

    // Validate and set default for days
    let numDaysHistorical = 2; // Default to 2 days
    if (daysStr) {
        const parsedDays = parseInt(daysStr, 10);
        if (!isNaN(parsedDays) && parsedDays >= 1 && parsedDays <= 5) {
            numDaysHistorical = parsedDays;
        } else {
            // Optional: return a 400 error if days is present but invalid, or just use default
            console.warn(`Invalid 'days' parameter: ${daysStr}. Defaulting to ${numDaysHistorical} days.`);
        }
    }

    const processedLat = parseFloat(lat).toFixed(2);
    const processedLon = parseFloat(lon).toFixed(2);
    let allReadings = [];

    try {
        if (!WEATHER_API_KEY) {
            console.warn('WEATHER_API_KEY is not set. Falling back to mock data for /api/pressure.');
            throw new Error('Server misconfiguration: Missing Weather API key');
        }

        // 1. Fetch Forecast Data (remains the same, typically provides a few days of forecast)
        // The forecast part of One Call API (hourly) usually gives 48 hours.
        const forecastURL = `https://api.openweathermap.org/data/3.0/onecall?lat=${processedLat}&lon=${processedLon}&exclude=current,minutely,daily,alerts&units=metric&appid=${WEATHER_API_KEY}`;
        // Cache key for forecast can remain the same as it's independent of historical days requested
        const forecastCacheKey = `fore-${processedLat}-${processedLon}`;
        const forecastData = await fetchAndCacheWeatherData(forecastURL, forecastCacheKey, FORECAST_PRESSURE_CACHE_DURATION);
        
        if (forecastData && forecastData.hourly) {
            forecastData.hourly.forEach(hour => {
                if (hour.dt && typeof hour.pressure !== 'undefined' && typeof hour.temp !== 'undefined') {
                    allReadings.push({ dt: hour.dt, pressure: hour.pressure, temp: hour.temp });
                }
            });
        }

        // 2. Fetch Historical Data based on numDaysHistorical
        const today = moment.utc(); 
        for (let i = 1; i <= numDaysHistorical; i++) {
            const targetDate = moment(today).subtract(i, 'days');
            const targetTimestamp = targetDate.unix();
            
            const historicalURL = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${processedLat}&lon=${processedLon}&dt=${targetTimestamp}&units=metric&appid=${WEATHER_API_KEY}`;
            // IMPORTANT: Add numDaysHistorical or targetDate to cache key if different day ranges affect historical data points for a given day (they shouldn't for OpenWeatherMap's timemachine)
            // For timemachine, each day is distinct, so the date in the key is sufficient.
            const historicalCacheKey = `hist-${processedLat}-${processedLon}-${targetDate.format('YYYYMMDD')}`;
            const historicalData = await fetchAndCacheWeatherData(historicalURL, historicalCacheKey, HISTORICAL_PRESSURE_CACHE_DURATION);

            const processHourlyData = (hourlyArr) => {
                if (hourlyArr) {
                    hourlyArr.forEach(hour => {
                        if (hour.dt && typeof hour.pressure !== 'undefined' && typeof hour.temp !== 'undefined') {
                            // Ensure we don't add duplicate historical points if API returns overlapping data for some reason
                            if (!allReadings.some(ar => ar.dt === hour.dt)) {
                                allReadings.push({ dt: hour.dt, pressure: hour.pressure, temp: hour.temp });
                            }
                        }
                    });
                }
            };

            // OWM timemachine for a specific dt returns data for that entire day (00:00 to 23:59 UTC)
            // The structure is usually { "lat": ..., "lon": ..., "timezone": ..., "timezone_offset": ..., "data": [{ "dt": ..., "hourly": [...] }] }
            // Or sometimes directly { "lat": ..., "hourly": [...] } if the API version/call is slightly different or for very recent past.
            // The provided code checks for `historicalData.data[0].hourly` and `historicalData.hourly`.
            if (historicalData && historicalData.data && historicalData.data[0] && historicalData.data[0].hourly) {
                processHourlyData(historicalData.data[0].hourly);
            } else if (historicalData && historicalData.hourly) { // Common for direct hourly array
                processHourlyData(historicalData.hourly);
            }
        }

        if (allReadings.length === 0 && dataSource === "openweathermap") {
            console.warn(`No data from OpenWeatherMap for ${processedLat},${processedLon} with ${numDaysHistorical} historical days. Attempting fallback to mock data.`);
            throw new Error("No data received from OpenWeatherMap"); 
        }

        const uniqueReadingsMap = new Map();
        allReadings.forEach(item => uniqueReadingsMap.set(item.dt, item));
        allReadings = Array.from(uniqueReadingsMap.values()).sort((a, b) => a.dt - b.dt);

        // Filter readings to ensure they are within the expected range (numDaysHistorical + forecast duration)
        // Forecast is typically 48 hours. Historical is numDaysHistorical.
        const filterStartDate = moment().subtract(numDaysHistorical, 'days').startOf('day').unix();
        // Forecast data from OneCall is usually 48 hours.
        const filterEndDate = moment().add(2, 'days').endOf('day').unix();

        allReadings = allReadings.filter(r => r.dt >= filterStartDate && r.dt <= filterEndDate);


        res.json({
            message: `Aggregated pressure and temperature data for lat: ${processedLat}, lon: ${processedLon} (Historical: ${numDaysHistorical} days)`,
            readings: allReadings,
            data_source: dataSource,
            requested_historical_days: numDaysHistorical
        });

    } catch (error) {
        console.error(`Error in /api/pressure route for ${processedLat},${processedLon} (source: ${dataSource}, days: ${numDaysHistorical}). Message: ${error.message}. Falling back to mock data.`);
        dataSource = "mock";
        // Pass numDaysHistorical to mock data generation
        allReadings = generateMockPressureTempData(processedLat, processedLon, numDaysHistorical);
        
        if (allReadings.length === 0) {
            return res.status(500).json({ 
                error: 'Failed to generate mock data after API failure.', 
                details: error.message,
                data_source: dataSource,
                requested_historical_days: numDaysHistorical
            });
        }
        res.status(200).json({ 
            message: `Serving mock pressure and temperature data for lat: ${processedLat}, lon: ${processedLon} (Historical: ${numDaysHistorical} days) due to OpenWeatherMap API error.`,
            readings: allReadings,
            data_source: dataSource,
            original_error_message: error.message,
            requested_historical_days: numDaysHistorical
        });
    }
});

module.exports = router;
