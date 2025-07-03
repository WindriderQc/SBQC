const router = require('express').Router();
// const fetch = require('node-fetch'); // No longer needed directly here if getJSON is moved
// const { parseStringPromise } = require('xml2js'); // No longer needed if getXML is removed

// Helper to fetch and parse JSON - MOVED to scripts/weatherUtils.js
// const getJSON = async (url) => { ... };

// Helper to fetch and parse XML - Kept for now if any other part of this file uses it, but likely can be removed.
// If fetchCurrentAndForecast is removed, this is not needed.
const getXML = async (url) => {
    const fetch = require('node-fetch'); // Add fetch require if it's the only consumer now
    const { parseStringPromise } = require('xml2js');
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch XML from ${url}. Status: ${response.status}, Body: ${errorText}`);
    }
    const text = await response.text();
    return parseStringPromise(text);
};

// Get station ID for Environment Canada's citypage_weather service.
// This function might still be useful if other parts of ecWeather route are used,
// or it could be moved/deprecated if this route is fully simplified.
function guessStation(lat, lon) {
  // Hardcoded example for Quebec City.
  // The citypage_weather service uses 'sXXXXXXX' site codes.
  // Found 's0000620' for Québec City from https://dd.weather.gc.ca/citypage_weather/docs/site_list_en.csv
  // Other codes like 'qc-133' or airport codes (e.g., 'YQB') might be for different EC services or older systems.
  if (Math.abs(lat - 46.81) < 0.1 && Math.abs(lon - (-71.20)) < 0.1) {
    return 's0000620'; // Quebec City site code for citypage_weather
  }
  // Default or throw error if no match - using Quebec City's s-code as default for now.
  // This fallback will likely not work for other locations without a proper lookup.
  return 's0000620'; // Fallback for now
}

// Fetch current conditions from GeoMet SWOB and forecast from EC XML
// This function is being deprecated in favor of OpenWeatherMap for current/forecast
// and weatherUtils.fetchHistorical for historical EC data.
/*
async function fetchCurrentAndForecast(siteCode, lat, lon) {
  let currentConditionsData = null;
  let forecastData = null;

  // 1. Fetch Current Conditions from GeoMet SWOB
  try {
    const lonMin = (lon - 0.1).toFixed(4);
    const latMin = (lat - 0.1).toFixed(4);
    const lonMax = (lon + 0.1).toFixed(4);
    const latMax = (lat + 0.1).toFixed(4);
    const swobUrl = `https://api.weather.gc.ca/collections/swob-realtime/items?bbox=${lonMin},${latMin},${lonMax},${latMax}&limit=1&f=json`;
    console.log(`Fetching current conditions from GeoMet SWOB (no sortby): ${swobUrl}`);
    // const swobResult = await getJSON(swobUrl); // getJSON was moved
    // ... rest of SWOB logic
  } catch (e) {
    console.error("Error fetching SWOB current conditions:", e.message);
    currentConditionsData = { error: `Failed to fetch SWOB current conditions: ${e.message}` };
  }

  // 2. Attempt to Fetch Forecast from XML
  try {
    const xmlUrl = `https://dd.weather.gc.ca/citypage_weather/QC/${siteCode}_e.xml`;
    console.log(`NEW_LOG_V3: Fetching current and forecast from EC XML (dd.meteo.gc.ca): ${xmlUrl}`);
    const xmlData = await getXML(xmlUrl);
    // ... rest of XML forecast logic
  } catch (e) {
    console.error("Error fetching XML forecast:", e.message);
    if (!forecastData) forecastData = { error: `Failed to fetch XML forecast: ${e.message}` };
    if (!currentConditionsData || currentConditionsData.error) {
        currentConditionsData = { error: `Failed to fetch current conditions from XML: ${e.message}` };
    }
  }

  return {
    current: currentConditionsData,
    forecast: forecastData
  };
}
*/

// Fetch historical data via GeoMet - MOVED to scripts/weatherUtils.js
// async function fetchHistorical(lat, lon, days = 3) { ... }


// Optional: Air Quality Health Index (AQHI) - Kept for now, uses getJSON (which was moved)
// If this route is simplified, this might need adjustment or removal.
// For now, to avoid breaking it if it's somehow used, we'd need getJSON back or make it use weatherUtils.
/*
async function fetchAQHI(lat, lon) {
  const fetch = require('node-fetch'); // local require if getJSON is not available
  const getJSON_local = async (url) => { // temp local definition
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch JSON from ${url}. Status: ${response.status}, Body: ${errorText}`);
    }
    return response.json();
  };

  const lonMin = (lon - 0.1).toFixed(4);
  const latMin = (lat - 0.1).toFixed(4);
  const lonMax = (lon + 0.1).toFixed(4);
  const latMax = (lat + 0.1).toFixed(4);
  const url = `https://api.weather.gc.ca/collections/aqhi-observations-realtime/items?bbox=${lonMin},${latMin},${lonMax},${latMax}&limit=1&f=json`;
  console.log(`Fetching AQHI from GeoMet: ${url}`);
  try {
    const data = await getJSON_local(url); // Use local or imported getJSON
    return data.features?.[0]?.properties || null;
  } catch (error) {
    console.error("AQHI fetch error:", error.message);
    return { error: "Failed to fetch AQHI data", details: error.message };
  }
}
*/

// Optional: Radar metadata reference - This is a simple function, can be kept.
function radarLayerInfo(lat, lon) {
  // Example BBOX for Quebec City area. This should be dynamically adjusted if possible.
  const qcLatMin = 46.0;
  const qcLonMin = -72.0;
  const qcLatMax = 47.5;
  const qcLonMax = -70.5;
  return {
    note: "Radar imagery available via GeoMet WMS endpoint. BBOX needs to be adjusted for actual location.",
    wms_example: `https://geo.weather.gc.ca/geomet?service=WMS&version=1.3.0&request=GetMap&layers=RADAR_1KM_RRAI&bbox=${qcLonMin},${qcLatMin},${qcLonMax},${latMax}&width=600&height=400&crs=EPSG:4326&format=image/png`
  };
}

// Main API route - This route's primary purpose is now under review.
// Commenting out its main logic as fetchCurrentAndForecast and fetchHistorical are being refactored/moved.
/*
router.get('/api/ec-weather', async (req, res) => {
  const lat = parseFloat(req.query.lat || '46.8139'); // Default to Quebec City area
  const lon = parseFloat(req.query.lon || '-71.208');
  const days = parseInt(req.query.days || '2'); // Default to 2 days historical to match previous behavior

  console.log(`EC Weather request for lat: ${lat}, lon: ${lon}, days: ${days}`);

  const stationId = guessStation(lat, lon); // Still uses local guessStation

  try {
    // const { fetchHistorical: ecFetchHistorical } = require('../scripts/weatherUtils'); // Example if importing

    // Execute all fetches in parallel
    // const [realtimeData, historicalData, aqhiData] = await Promise.all([
    //   fetchCurrentAndForecast(stationId, lat, lon).catch(e => { console.error("Error fetching current/forecast:", e.message); return { error: e.message }; }),
    //   ecFetchHistorical(lat, lon, days).catch(e => { console.error("Error fetching historical:", e.message); return { error: e.message }; }), // Use imported
    //   fetchAQHI(lat, lon) // AQHI might need its getJSON source resolved
    // ]);

    // const output = {
    //   metadata: {
    //     location: { lat, lon },
    //     stationId_used_for_current_forecast: stationId,
    //     historical_bbox: `${(lon - 0.1).toFixed(4)},${(lat - 0.1).toFixed(4)},${(lon + 0.1).toFixed(4)},${(lat + 0.1).toFixed(4)}`,
    //     aqhi_bbox: `${(lon - 0.1).toFixed(4)},${(lat - 0.1).toFixed(4)},${(lon + 0.1).toFixed(4)},${(lat + 0.1).toFixed(4)}`,
    //     fetched_at: new Date().toISOString()
    //   },
    //   current_conditions: realtimeData.current || realtimeData,
    //   forecasts: realtimeData.forecast || null,
    //   historical_observations: historicalData,
    //   air_quality_health_index: aqhiData,
    //   radar_info: radarLayerInfo(lat, lon)
    // };

    // res.json(output);
    res.status(501).json({ message: "This EC Weather endpoint is currently under refactoring. Please use other specific endpoints." });

  } catch (err) {
    console.error('Main EC weather processing error:', err);
    res.status(500).json({ error: 'Failed to fetch Environment Canada weather data', details: err.message });
  }
});
*/

// If this route file becomes mostly empty, it could be removed or repurposed.
// For now, just exporting the router.
module.exports = router;