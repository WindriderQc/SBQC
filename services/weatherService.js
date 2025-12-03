const { fetchJSON, fetchText } = require('./apiClient');
const moment = require('moment');

const apiKeys = {
    weather: process.env.WEATHER_API_KEY,
    tides: process.env.API_TIDES_KEY,
    openaq: process.env.OPENAQ_API_KEY,
};

// --- Caching for TLE and Pressure ---
let tleCache = { data: null, timestamp: 0 };
const TLE_CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

const pressureAPIResponseCache = {};
const HISTORICAL_PRESSURE_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours
const FORECAST_PRESSURE_CACHE_DURATION = 1 * 60 * 60 * 1000;   // 1 hour

// --- Caching for Weather and Tides ---
const weatherCache = {};
const tidesCache = {};
const WEATHER_CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const TIDES_CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

// --- Weather ---
async function getWeatherAndAirQuality(lat, lon) {
    const cacheKey = `${lat},${lon}`;
    const cachedData = weatherCache[cacheKey];

    if (cachedData && (Date.now() - cachedData.timestamp < WEATHER_CACHE_DURATION_MS)) {
        return cachedData.data;
    }

    if (!apiKeys.weather) {
        throw new Error('Server configuration error: Missing weather API key.');
    }

    const weatherURL = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&APPID=${apiKeys.weather}`;

    // Fetch weather data
    const weather = await fetchJSON(weatherURL);

    // Try to fetch air quality data, but don't fail if it's unavailable
    let airQualityData = null;
    if (apiKeys.openaq) {
        try {
            const aq_url = `https://api.openaq.org/v3/locations?coordinates=${lat},${lon}&radius=5000`;
            const aq_data = await fetchJSON(aq_url, { headers: { 'X-API-Key': apiKeys.openaq } });

            if (aq_data.results && aq_data.results.length > 0) {
                // Sort by most recent data
                const sortedSensors = aq_data.results.sort((a, b) => 
                    new Date(b.datetimeLast) - new Date(a.datetimeLast)
                );
                const latestSensor = sortedSensors[0];

                // Try to get detailed sensor data, but use basic data if it fails
                if (latestSensor && latestSensor.id) {
                    try {
                        const sensor_url = `https://api.openaq.org/v3/sensors/${latestSensor.id}`;
                        const sensorDetails = await fetchJSON(sensor_url, { 
                            headers: { 'X-API-Key': apiKeys.openaq } 
                        });
                        airQualityData = sensorDetails;
                    } catch (sensorError) {
                        // Sensor details failed, use basic location data instead
                        console.warn(`Sensor ${latestSensor.id} details unavailable, using location data: ${sensorError.message}`);
                        airQualityData = aq_data;
                    }
                } else {
                    airQualityData = aq_data;
                }
            }
        } catch (aqError) {
            // Air quality API failed completely, continue without it
            console.warn(`Air quality data unavailable: ${aqError.message}`);
        }
    }

    const result = { 
        weather, 
        air_quality: airQualityData || { status: 'unavailable', message: 'No air quality data available for this location' }
    };
    
    weatherCache[cacheKey] = { data: result, timestamp: Date.now() };

    return result;
}

// --- Tides ---
async function getTides(lat, lon, days) {
    const cacheKey = `${lat},${lon},${days}`;
    const cachedData = tidesCache[cacheKey];

    if (cachedData && (Date.now() - cachedData.timestamp < TIDES_CACHE_DURATION_MS)) {
        return cachedData.data;
    }

    if (!apiKeys.tides) {
        throw new Error('Server configuration error: Missing Tides API key.');
    }
    const worldTidesURL = `https://www.worldtides.info/api/v3?heights&extremes&key=${apiKeys.tides}&lat=${lat}&lon=${lon}&days=${days}`;
    const result = await fetchJSON(worldTidesURL);

    tidesCache[cacheKey] = { data: result, timestamp: Date.now() };
    return result;
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
    try {
        const data = await fetchText(TLE_CELESTRAK_URL);
        tleCache = { data, timestamp: now };
        return data;
    } catch (error) {
        console.error("Error fetching TLE data from Celestrak:", error.message);
        // Return stale data if available, otherwise re-throw
        if (tleCache.data) {
            console.warn("Returning stale TLE data due to fetch error.");
            return tleCache.data;
        }
        throw new Error("Failed to fetch TLE data and no cache is available.");
    }
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
    if (!apiKeys.weather) {
        console.warn('WEATHER_API_KEY is not set. Falling back to mock data for pressure.');
        return generateMockPressureTempData(lat, lon, numDaysHistorical);
    }

    try {
        const processedLat = parseFloat(lat).toFixed(2);
        const processedLon = parseFloat(lon).toFixed(2);
        let allReadings = [];

        // Fetch Forecast
        const forecastURL = `https://api.openweathermap.org/data/3.0/onecall?lat=${processedLat}&lon=${processedLon}&exclude=current,minutely,daily,alerts&units=metric&appid=${apiKeys.weather}`;
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
            const historicalURL = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${processedLat}&lon=${processedLon}&dt=${targetTimestamp}&units=metric&appid=${apiKeys.weather}`;
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

        // Calculate real averages using sampling strategy
        let averages = { week: null, month: null, year: null };
        try {
            averages = await calculateRealAverages(processedLat, processedLon, apiKeys.weather);
        } catch (avgErr) {
            console.warn("Failed to calculate real averages:", avgErr.message);
        }
        // Note: Real averages for month/year would require many API calls.
        // For now we will return simplified or null values for month/year to avoid heavy API usage.

        return {
            readings: sortedReadings,
            data_source: "openweathermap",
            averages: {
                // Placeholder: to be implemented with sampling strategy if needed
                week: null,
                month: null,
                year: null
            }
        };

    } catch (error) {
        console.error(`Error in getPressure. Falling back to mock data. ${error.message}`);
        return generateMockPressureTempData(lat, lon, numDaysHistorical);
    }
}

function calculateMockVal(timestamp) {
    const time = moment.unix(timestamp);
    const hourOfYear = time.dayOfYear() * 24 + time.hour();
    const basePressure = 1012, pressureVariability = 10;
    const baseTemp = 15, tempVariability = 5;

    const pressure = basePressure + (Math.sin(hourOfYear * 2 * Math.PI / (365*12)) * (pressureVariability/2)) + (Math.sin(hourOfYear * 2 * Math.PI / 12) * (pressureVariability/3)) + (Math.random() * pressureVariability/3 - pressureVariability/6);
    const temp = baseTemp + (Math.sin(hourOfYear * 2 * Math.PI / 8760) * tempVariability*2) + (Math.sin(hourOfYear * 2 * Math.PI / 24 + Math.PI) * tempVariability) + (Math.random() * tempVariability/2 - tempVariability/4);

    return { pressure, temp };
}

async function calculateRealAverages(lat, lon, apiKey) {
    const now = moment.utc();

    // Sampling points (days ago)
    const samplesWeek = [2, 4, 7];
    const samplesMonth = [10, 20, 30];
    const samplesYear = [60, 120, 180, 240, 300, 360];

    const fetchSample = async (daysAgo) => {
        const targetDate = moment(now).subtract(daysAgo, 'days');
        const targetTimestamp = targetDate.unix();
        const url = `https://api.openweathermap.org/data/3.0/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${targetTimestamp}&units=metric&appid=${apiKey}`;
        const cacheKey = `hist-${lat}-${lon}-${targetDate.format('YYYYMMDD')}`;

        try {
            const data = await fetchAndCacheWeatherData(url, cacheKey, HISTORICAL_PRESSURE_CACHE_DURATION);
            if (data && data.data && data.data.length > 0) {
                let sum = 0;
                data.data.forEach(d => sum += d.pressure);
                return sum / data.data.length;
            }
        } catch (e) {
            console.warn(`Failed to fetch sample for ${daysAgo} days ago: ${e.message}`);
        }
        return null;
    };

    const distinctDays = [...new Set([...samplesWeek, ...samplesMonth, ...samplesYear])];
    const results = await Promise.all(distinctDays.map(day => fetchSample(day).then(val => ({ day, val }))));
    const resultMap = new Map(results.map(r => [r.day, r.val]));

    const calcAvg = (daysArray) => {
        let sum = 0;
        let count = 0;
        daysArray.forEach(d => {
            const val = resultMap.get(d);
            if (val !== null && val !== undefined) {
                sum += val;
                count++;
            }
        });
        return count > 0 ? parseFloat((sum / count).toFixed(1)) : null;
    };

    return {
        week: calcAvg(samplesWeek),
        month: calcAvg(samplesMonth),
        year: calcAvg(samplesYear)
    };
}

function generateMockPressureTempData(lat, lon, numDaysHistorical = 2, numDaysForecast = 2) {
    const readings = [];
    const now = moment.utc();

    const totalDataPoints = (numDaysHistorical + numDaysForecast) * 24;
    const startTime = moment(now).subtract(numDaysHistorical, 'days').startOf('hour');

    for (let i = 0; i < totalDataPoints; i++) {
        const currentTime = moment(startTime).add(i, 'hours');
        const { pressure, temp } = calculateMockVal(currentTime.unix());
        readings.push({ dt: currentTime.unix(), pressure: parseFloat(pressure.toFixed(1)), temp: parseFloat(temp.toFixed(1)) });
    }

    // Calculate averages for Week, Month, Year
    const calculateAverageSampled = (daysBack, sampleEveryHours = 1) => {
         let sumPressure = 0;
         let count = 0;
         const start = moment(now).subtract(daysBack, 'days').startOf('hour');
         const totalHours = daysBack * 24;
         for(let i=0; i<totalHours; i+=sampleEveryHours) {
              const t = moment(start).add(i, 'hours');
              const { pressure } = calculateMockVal(t.unix());
              sumPressure += pressure;
              count++;
         }
         return parseFloat((sumPressure / count).toFixed(1));
    };

    const averages = {
        week: calculateAverageSampled(7, 4), // Sample every 4 hours
        month: calculateAverageSampled(30, 12), // Sample every 12 hours
        year: calculateAverageSampled(365, 24) // Sample every 24 hours
    };

    const forecastEndTime = moment(now).add(numDaysForecast, 'days').endOf('day').unix();
    return {
        readings: readings.filter(r => r.dt <= forecastEndTime),
        data_source: "mock",
        averages
    };
}


module.exports = {
    getWeatherAndAirQuality,
    getTides,
    getGeolocation,
    getTLE,
    getPressure,
};