const router = require('express').Router();
//const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fetch = require('node-fetch');

// TLE Cache variables
let tleCache = { data: null, timestamp: 0 };
const TLE_CELESTRAK_URL = 'https://celestrak.com/NORAD/elements/stations.txt';
const TLE_CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

const moment = require('moment');
const getMqtt = require('../scripts/mqttServer').getClient;
const mailman = require('../public/js/mailman'); // For /alert route

// Environment variables
const apiUrl = process.env.DATA_API_URL + (process.env.DATA_API_PORT ? ":" + process.env.DATA_API_PORT : "");
// Note: WEATHER_API_KEY and OPENAQ_API_KEY are used directly via process.env in the /weather route

router.get('/weather/:latlon', async (req, res) => {

    const [lat, lon] = req.params.latlon.split(',');
   const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&APPID=${process.env.WEATHER_API_KEY}`;

    const aq_url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=5000`;

    console.log(lat, lon);

    try {
        const weather_response = await fetch(weatherURL);
       // console.log(weather_response)
        if (!weather_response.ok) {
            throw new Error(`Failed to fetch weather data: ${weather_response.statusText}`);
        }
        const weather = await weather_response.json();
        console.log('Weather data:', weather);

        const aq_response = await fetch(aq_url, {
            headers: {
                'X-API-Key': process.env.OPENAQ_API_KEY
            }
        });
        if (!aq_response.ok) {
            const errorText = await aq_response.text();
            throw new Error(`Failed to fetch air quality data: ${aq_response.statusText} - ${errorText}`);
        }
        const aq_data = await aq_response.json();
        //console.log(aq_data);

        const sensor =  aq_data.results
        if (Array.isArray(sensor)) {
            sensor.sort((a, b) => new Date(b.datetimeLast) - new Date(a.datetimeLast));
        }

        const sensorAQ = sensor[0]
        console.log('Sensor:', sensorAQ.id)

        const sensor_url = `https://api.openaq.org/v3/sensors/${sensorAQ.id}`;
        const sensor_response = await fetch(sensor_url, {
            headers: {
                'X-API-Key': process.env.OPENAQ_API_KEY
            }
        });
        const sensor_data = await sensor_response.json();
        console.log('Sensor data:', sensor_data)

        const data = {
            weather: weather,
            air_quality: sensor_data
        };
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch weather or air quality data' });
    }
});

router.get('/tides', async (req, res) => {
    const { lat, lon, days } = req.query;
    const apiKey = process.env.API_TIDES_KEY;

    if (!apiKey) {
        console.error('API_TIDES_KEY is not set in environment variables.');
        return res.status(500).json({ error: 'Server configuration error: Missing API key.' });
    }

    if (!lat || !lon || !days) {
        return res.status(400).json({ error: 'Missing required query parameters: lat, lon, days.' });
    }

    const worldTidesURL = `https://www.worldtides.info/api/v3?heights&extremes&key=${apiKey}&lat=${lat}&lon=${lon}&days=${days}`;

    try {
        const response = await fetch(worldTidesURL);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch tide data from worldtides.info: ${response.status} - ${errorText}`);
            return res.status(response.status).json({ error: 'Failed to fetch tide data', details: errorText });
        }
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching tide data:', error);
        res.status(500).json({ error: 'Server error while fetching tide data' });
    }
});

router.get('/proxy-location', async (req, res) => {
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log("Client IP:", clientIp);
    const response = await fetch('https://api64.ipify.org?format=json');
    const { ip } = await response.json();
    console.log("Public IP:", ip);
    try {
        const response = await fetch(`http://ip-api.com/json/${ip}`);   //  because this is http, we use a proxy approach to make it work
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching geolocation', details: error.message });
    }
});


router.post('/alert', async (req, res) => {

    console.log('post to Alert:')
    //console.log(req.body)
   // let dat = JSON.stringify(req.body)
   // console.log(dat)

    const alert = req.body
    const dest = alert.dest
    const msg = alert.msg
    const image64 = alert.image64
    console.log(dest, msg);

    mailman.sendEmail(dest, msg, image64)
    res.status(200).send("Alert processed");

})




router.get('/deviceLatest/:esp',  async (req, res) =>
{
    let option = {
        method: 'GET',
        headers: {
            'auth-token': req.session.userToken // Assumes session middleware is active
        }
    }

    try {
        const response = await fetch(apiUrl + "/heartbeats/senderLatest/" + req.params.esp, option)
        const respData = await response.json()
        const data = respData.data[0]
        //console.log(data)

        if (!data) {
            res.json({ status: "error", message: 'Could not get data, no latest post', data: null  })
            //return res.status(400).send(message);
        }
        else {

           /* let now =  new moment()
            let stamp =  new moment(data.time).format('YYYY-MM-DD HH:mm:ss')
            let duration = new moment.duration(now.diff(stamp)).asHours();

            data.lastConnect = duration

            if(data.wifi != -100) {
                 if(duration > 0.05)
                 {
                    console.log('Device disconnected !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
                    data.wifi   = -100
                    delete data._id
                    let dat = JSON.stringify(data)
                    console.log(dat)
                    let mq = getMqtt()
                    mq.publish('esp32/alive/'+req.params.esp, dat)  //  server sends a mqtt post on behalf of esp to log a last wifi -100 signal in db.
                 }
             }*/

            res.json({ status: "success", message: "Latest post retreived", data: data  })
        }
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ status: "error", message: "Error retrieving latest device data." });
    }
})

router.post('/saveProfile', async (req, res) => {
    const { profileName, config } = req.body;

    const profileData = {
        profileName,
        config
    };

    const option = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'auth-token': req.session.userToken // Assumes session middleware is active
        },
        body: JSON.stringify(profileData)
    };

    try {
        const response = await fetch(apiUrl + "/profile/" + profileData.profileName, option);
        const result = await response.json();

        if (response.ok) {
            res.send('Profile saved successfully!');
        } else {
            console.error('Error saving profile:', result);
            res.status(response.status).send('Error saving profile: ' + result.message);
        }
    } catch (err) {
        console.error('Error connecting to Data API:', err);
        res.status(500).send('Error connecting to Data API: ' + err.message);
    }
});


router.get('/data/:options',  async (req, res) =>
{
    const options = req.params.options.split(',')
    const samplingRatio = options[0]
    const espID = options[1]
    const dateFrom = options[2]
    const ratio = Number(samplingRatio)
    console.log({ ratio, espID, dateFrom })

    if (req.session) { // Assumes session middleware is active
        req.session.selectedDevice = espID;
    }


    let option = { method: 'GET', headers: { 'auth-token': req.session.userToken  }    }

    try {
        const response = await fetch(apiUrl + "/heartbeats/data/" + samplingRatio + "," + espID + ',' + dateFrom, option)
        const respData = await response.json()
        const data = respData.data
        res.json(data)
    }
    catch (err) {
        console.error(err)
        return res.status(400).send("Could not get data");
    }
})

// Route to serve TLE data (will include caching logic in a subsequent step)
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
        // If fetch fails, and we have stale cache, we could optionally serve it.
        // For now, just sending an error.
        res.status(500).json({ error: 'Unable to fetch TLE data' });
    }
});

// --- Barometric Pressure API Endpoint with Caching ---

const pressureAPIResponseCache = {};
const HISTORICAL_PRESSURE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const FORECAST_PRESSURE_CACHE_DURATION = 1 * 60 * 60 * 1000;   // 1 hour
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

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
            console.error(`Failed to fetch weather data from OpenWeatherMap (${url}): ${response.status} - ${errorText}`);
            // Optionally, return stale cache if available and preferred
            // if (cachedEntry) { return cachedEntry.data; }
            throw new Error(`OpenWeatherMap API error: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        pressureAPIResponseCache[cacheKey] = {
            data: data,
            timestamp: Date.now(),
            duration: cacheDuration
        };
        console.log(`[Cache STORE] Stored pressure data for key: ${cacheKey}`);
        return data;
    } catch (error) {
        console.error(`Error in fetchAndCacheWeatherData for URL (${url}):`, error.message);
        // Do not return stale cache here, let the main handler decide on mock fallback
        throw error;
    }
}

function generateMockPressureTempData(lat, lon, numDaysHistorical = 2, numDaysForecast = 2) {
    console.log(`Generating mock pressure and temperature data for lat: ${lat}, lon: ${lon}`);
    const readings = [];
    const now = moment.utc(); // Use UTC for consistency
    const basePressure = 1012; // hPa
    const pressureVariability = 10; // hPa
    const baseTemp = 15; // Celsius
    const tempVariability = 5; // Celsius

    const totalDays = numDaysHistorical + numDaysForecast;
    const startTime = moment(now).subtract(numDaysHistorical, 'days');

    for (let d = 0; d < totalDays; d++) {
        for (let h = 0; h < 24; h++) {
            const currentTime = moment(startTime).add(d, 'days').add(h, 'hours');
            // Simulate some daily and hourly fluctuation
            const pressure = basePressure +
                (Math.sin(((d * 24) + h) * 2 * Math.PI / 48) * (pressureVariability / 2)) + // Slower overall wave for pressure
                (Math.random() * pressureVariability / 2 - pressureVariability / 4) +
                (Math.sin(h * 2 * Math.PI / 12) * 2);

            const temp = baseTemp +
                (Math.sin(((d * 24) + h) * 2 * Math.PI / 24) * tempVariability) + // Daily temp wave
                (Math.random() * tempVariability / 2 - tempVariability / 4);

            readings.push({
                dt: currentTime.unix(),
                pressure: parseFloat(pressure.toFixed(1)),
                temp: parseFloat(temp.toFixed(1))
            });
        }
    }
    readings.sort((a, b) => a.dt - b.dt);
    // Ensure we only return data up to numDaysForecast into the future from "now"
    const forecastEndTime = moment(now).add(numDaysForecast, 'days').endOf('day').unix();
    return readings.filter(r => r.dt <= forecastEndTime);
}

router.get('/pressure', async (req, res) => {
    const { lat, lon } = req.query;
    let dataSource = "openweathermap"; // Assume success initially

    if (!lat || !lon) {
        return res.status(400).json({ error: 'Missing required query parameters: lat, lon.' });
    }

    const processedLat = parseFloat(lat).toFixed(2);
    const processedLon = parseFloat(lon).toFixed(2);
    let allReadings = [];

    try {
        if (!WEATHER_API_KEY) {
            console.warn('WEATHER_API_KEY is not set. Falling back to mock data for /api/pressure.');
            throw new Error('Missing Weather API key'); // Trigger fallback
        }

        // 1. Fetch Forecast Data
        const forecastURL = `https://api.openweathermap.org/data/3.0/onecall?lat=${processedLat}&lon=${processedLon}&exclude=current,minutely,daily,alerts&units=metric&appid=${WEATHER_API_KEY}`;
        const forecastCacheKey = `fore-${processedLat}-${processedLon}`;
        const forecastData = await fetchAndCacheWeatherData(forecastURL, forecastCacheKey, FORECAST_PRESSURE_CACHE_DURATION);

        if (forecastData && forecastData.hourly) {
            forecastData.hourly.forEach(hour => {
                if (hour.dt && typeof hour.pressure !== 'undefined' && typeof hour.temp !== 'undefined') {
                    allReadings.push({ dt: hour.dt, pressure: hour.pressure, temp: hour.temp });
                }
            });
        }

        // 2. Fetch Historical Data
        const today = moment.utc();
        for (let i = 1; i <= 2; i++) {
            const targetDate = moment(today).subtract(i, 'days');
            const targetTimestamp = targetDate.unix();

            const historicalURL = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${processedLat}&lon=${processedLon}&dt=${targetTimestamp}&units=metric&appid=${WEATHER_API_KEY}`;
            const historicalCacheKey = `hist-${processedLat}-${processedLon}-${targetDate.format('YYYYMMDD')}`;
            const historicalData = await fetchAndCacheWeatherData(historicalURL, historicalCacheKey, HISTORICAL_PRESSURE_CACHE_DURATION);

            const processHourlyData = (hourlyArr) => {
                if (hourlyArr) {
                    hourlyArr.forEach(hour => {
                        if (hour.dt && typeof hour.pressure !== 'undefined' && typeof hour.temp !== 'undefined') {
                            allReadings.push({ dt: hour.dt, pressure: hour.pressure, temp: hour.temp });
                        }
                    });
                }
            };

            if (historicalData && historicalData.data && historicalData.data[0] && historicalData.data[0].hourly) {
                processHourlyData(historicalData.data[0].hourly);
            } else if (historicalData && historicalData.hourly) { // Fallback for potentially flatter structure from cache or direct response
                processHourlyData(historicalData.hourly);
            }
        }

        if (allReadings.length === 0 && dataSource === "openweathermap") {
            // If we intended to get data from OpenWeatherMap but got none (e.g. API returned empty or unexpected structure for all calls)
            console.warn(`No data from OpenWeatherMap for ${processedLat},${processedLon}. Attempting fallback to mock data.`);
            throw new Error("No data received from OpenWeatherMap"); // This will trigger the mock data fallback
        }

        // Remove duplicates and sort
        const uniqueReadings = Array.from(new Map(allReadings.map(item => [item.dt, item])).values());
        uniqueReadings.sort((a, b) => a.dt - b.dt);
        allReadings = uniqueReadings;

        res.json({
            message: `Aggregated pressure and temperature data for lat: ${processedLat}, lon: ${processedLon}`,
            readings: allReadings,
            data_source: dataSource
        });

    } catch (error) {
        console.error(`Error in /api/pressure route for ${processedLat},${processedLon} (source: ${dataSource}): ${error.message}. Falling back to mock data.`);
        dataSource = "mock";
        allReadings = generateMockPressureTempData(processedLat, processedLon);
        if (allReadings.length === 0) {
            // Should not happen with mock generation logic, but as a safeguard:
            return res.status(500).json({
                error: 'Failed to generate mock data.',
                details: error.message,
                data_source: dataSource
            });
        }
        res.status(200).json({ // Send 200 for mock data, but indicate it's mock
            message: `Serving mock pressure and temperature data for lat: ${processedLat}, lon: ${processedLon} due to previous error.`,
            readings: allReadings,
            data_source: dataSource,
            original_error: error.message
        });
    }
});

module.exports = router;
                    }
                });
            }
        }

        // Remove duplicates (e.g. if historical and forecast overlap for current hour)
        // and sort chronologically
        const uniqueReadings = Array.from(new Map(allPressureReadings.map(item => [item.dt, item])).values());
        uniqueReadings.sort((a, b) => a.dt - b.dt);

        allPressureReadings = uniqueReadings;

        if (allPressureReadings.length === 0) {
             console.warn(`No pressure data compiled for lat:${processedLat}, lon:${processedLon}`);
            return res.status(404).json({ message: 'No pressure data available for the location or period.', readings: [] });
        }

        res.json({
            message: `Aggregated pressure data for lat: ${processedLat}, lon: ${processedLon}`,
            readings: allPressureReadings,
            source: 'OpenWeatherMap OneCall API 3.0'
        });

    } catch (error) {
        console.error(`Error in /api/pressure route for ${processedLat},${processedLon}:`, error.message);
        res.status(500).json({ error: 'Failed to retrieve or process pressure data.', details: error.message });
    }
});

module.exports = router;
