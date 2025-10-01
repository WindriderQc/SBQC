const { fetchJSON, fetchText } = require('./apiClient');
const moment = require('moment');

const { WEATHER_API_KEY, API_TIDES_KEY, OPENAQ_API_KEY } = process.env;

// --- Caching for TLE and Pressure ---
let tleCache = { data: null, timestamp: 0 };
const TLE_CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

const pressureAPIResponseCache = {};
const HISTORICAL_PRESSURE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const FORECAST_PRESSURE_CACHE_DURATION = 1 * 60 * 60 * 1000;   // 1 hour

// --- Weather ---
async function getWeatherAndAirQuality(lat, lon) {
    if (!WEATHER_API_KEY || !OPENAQ_API_KEY) {
        throw new Error('Server configuration error: Missing weather or air quality API key.');
    }

    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&APPID=${WEATHER_API_KEY}`;
    const aq_url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=5000`;

    // Fetch in parallel
    const [weather, aq_data] = await Promise.all([
        fetchJSON(weatherURL),
        fetchJSON(aq_url, { headers: { 'X-API-Key': OPENAQ_API_KEY } })
    ]);

    let sensorAQData = null;
    if (aq_data.results && aq_data.results.length > 0) {
        const sortedSensors = aq_data.results.sort((a, b) => new Date(b.datetimeLast) - new Date(a.datetimeLast));
        const latestSensor = sortedSensors[0];
        if (latestSensor && latestSensor.id) {
            const sensor_url = `https://api.openaq.org/v3/sensors/${latestSensor.id}`;
            try {
                sensorAQData = await fetchJSON(sensor_url, { headers: { 'X-API-Key': OPENAQ_API_KEY } });
            } catch (e) {
                console.warn(`Could not fetch details for sensor ${latestSensor.id}: ${e.message}`);
            }
        }
    }

    return { weather, air_quality: sensorAQData || aq_data };
}

// --- Tides ---
async function getTides(lat, lon, days) {
    if (!API_TIDES_KEY) {
        throw new Error('Server configuration error: Missing Tides API key.');
    }
    const worldTidesURL = `https://www.worldtides.info/api/v3?heights&extremes&key=${API_TIDES_KEY}&lat=${lat}&lon=${lon}&days=${days}`;
    return await fetchJSON(worldTidesURL);
}

// --- Geolocation ---
async function getGeolocation() {
    const { ip: publicIp } = await fetchJSON('https://api64.ipify.org?format=json');
    return await fetchJSON(`http://ip-api.com/json/${publicIp}`);
}

// --- TLE ---
async function getTLE() {
    const now = Date.now();
    if (now - tleCache.timestamp < TLE_CACHE_DURATION_MS && tleCache.data) {
        return tleCache.data;
    }
    const TLE_CELESTRAK_URL = 'https://celestrak.com/NORAD/elements/stations.txt';
    const data = await fetchText(TLE_CELESTRAK_URL);
    tleCache = { data, timestamp: now };
    return data;
}

// --- Barometric Pressure ---
async function fetchAndCacheWeatherData(url, cacheKey, cacheDuration) {
    const cachedEntry = pressureAPIResponseCache[cacheKey];
    if (cachedEntry && (Date.now() - cachedEntry.timestamp < cacheDuration)) {
        return cachedEntry.data;
    }
    const data = await fetchJSON(url);
    pressureAPIResponseCache[cacheKey] = { data, timestamp: Date.now(), duration: cacheDuration };
    return data;
}

async function getPressure(lat, lon, numDaysHistorical = 2) {
    if (!WEATHER_API_KEY) {
        console.warn('WEATHER_API_KEY is not set. Falling back to mock data for pressure.');
        return generateMockPressureTempData(lat, lon, numDaysHistorical);
    }

    try {
        const processedLat = parseFloat(lat).toFixed(2);
        const processedLon = parseFloat(lon).toFixed(2);
        let allReadings = [];

        // Fetch Forecast
        const forecastURL = `https://api.openweathermap.org/data/3.0/onecall?lat=${processedLat}&lon=${processedLon}&exclude=current,minutely,daily,alerts&units=metric&appid=${WEATHER_API_KEY}`;
        const forecastCacheKey = `fore-${processedLat}-${processedLon}`;
        const forecastData = await fetchAndCacheWeatherData(forecastURL, forecastCacheKey, FORECAST_PRESSURE_CACHE_DURATION);
        if (forecastData && forecastData.hourly) {
            allReadings.push(...forecastData.hourly.map(h => ({ dt: h.dt, pressure: h.pressure, temp: h.temp })));
        }

        // Fetch Historical Data
        const historicalPromises = [];
        for (let i = 1; i <= numDaysHistorical; i++) {
            const targetDate = moment.utc().subtract(i, 'days');
            const targetTimestamp = targetDate.unix();
            const historicalURL = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${processedLat}&lon=${processedLon}&dt=${targetTimestamp}&units=metric&appid=${WEATHER_API_KEY}`;
            const historicalCacheKey = `hist-${processedLat}-${processedLon}-${targetDate.format('YYYYMMDD')}`;
            historicalPromises.push(fetchAndCacheWeatherData(historicalURL, historicalCacheKey, HISTORICAL_PRESSURE_CACHE_DURATION));
        }

        const historicalResults = await Promise.all(historicalPromises);
        for (const historicalData of historicalResults) {
            if (historicalData && historicalData.data && Array.isArray(historicalData.data)) {
                 allReadings.push(...historicalData.data.map(h => ({ dt: h.dt, pressure: h.pressure, temp: h.temp })));
            }
        }

        // Deduplicate and sort
        const uniqueReadingsMap = new Map();
        allReadings.forEach(item => uniqueReadingsMap.set(item.dt, item));
        const sortedReadings = Array.from(uniqueReadingsMap.values()).sort((a, b) => a.dt - b.dt);

        return {
            readings: sortedReadings,
            data_source: "openweathermap",
        };

    } catch (error) {
        console.error(`Error in getPressure. Falling back to mock data. ${error.message}`);
        return generateMockPressureTempData(lat, lon, numDaysHistorical);
    }
}

function generateMockPressureTempData(lat, lon, numDaysHistorical = 2, numDaysForecast = 2) {
    const readings = [];
    const now = moment.utc();
    const basePressure = 1012, pressureVariability = 10;
    const baseTemp = 15, tempVariability = 5;
    const totalDataPoints = (numDaysHistorical + numDaysForecast) * 24;
    const startTime = moment(now).subtract(numDaysHistorical, 'days').startOf('hour');

    for (let i = 0; i < totalDataPoints; i++) {
        const currentTime = moment(startTime).add(i, 'hours');
        const hourOfYear = currentTime.dayOfYear() * 24 + currentTime.hour();
        const pressure = basePressure + (Math.sin(hourOfYear * 2 * Math.PI / (365*12)) * (pressureVariability/2)) + (Math.sin(hourOfYear * 2 * Math.PI / 12) * (pressureVariability/3)) + (Math.random() * pressureVariability/3 - pressureVariability/6);
        const temp = baseTemp + (Math.sin(hourOfYear * 2 * Math.PI / 8760) * tempVariability*2) + (Math.sin(hourOfYear * 2 * Math.PI / 24 + Math.PI) * tempVariability) + (Math.random() * tempVariability/2 - tempVariability/4);
        readings.push({ dt: currentTime.unix(), pressure: parseFloat(pressure.toFixed(1)), temp: parseFloat(temp.toFixed(1)) });
    }
    const forecastEndTime = moment(now).add(numDaysForecast, 'days').endOf('day').unix();
    return {
        readings: readings.filter(r => r.dt <= forecastEndTime),
        data_source: "mock"
    };
}


module.exports = {
    getWeatherAndAirQuality,
    getTides,
    getGeolocation,
    getTLE,
    getPressure,
};