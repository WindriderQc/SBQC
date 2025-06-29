const router = require('express').Router();
const fetch = require('node-fetch'); // Assuming node-fetch is already a dependency from api.routes.js
const { parseStringPromise } = require('xml2js');

// Helper to fetch and parse JSON
const getJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch JSON from ${url}. Status: ${response.status}, Body: ${errorText}`);
    }
    return response.json();
};

// Helper to fetch and parse XML
const getXML = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch XML from ${url}. Status: ${response.status}, Body: ${errorText}`);
    }
    const text = await response.text();
    return parseStringPromise(text);
};

// Get 3-letter station ID (e.g., "QCH" for Quebec City)
// For now, this will be very basic. It should be improved later.
function guessStation(lat, lon) {
  // Hardcoded example for Quebec City — expand this with mapping if needed
  // This is a common pattern for EC station IDs like "s0000430" (Quebec City/Jean Lesage Intl AP)
  // The XML citypage URLs use different IDs (like YQB_e.xml or s0000430_e.xml - needs checking)
  // For dd.weather.gc.ca/citypage_weather/xml/QC/
  // It seems to use codes like 's0000430' (Quebec City) rather than 3-letter airport codes.
  // Let's use a known one for Quebec City for dd.weather.gc.ca
  if (Math.abs(lat - 46.81) < 0.1 && Math.abs(lon - (-71.20)) < 0.1) {
    return 's0000430'; // Quebec City (Jean Lesage Airport)
  }
  // Default or throw error if no match
  return 's0000430'; // Fallback for now
}

// Fetch current and forecast from EC XML
async function fetchCurrentAndForecast(stationId) {
  // Corrected URL structure for station s0000430
  const url = `https://dd.weather.gc.ca/citypage_weather/xml/QC/${stationId}_e.xml`;
  console.log(`Fetching current and forecast from EC XML: ${url}`);
  const data = await getXML(url);

  const current = data.siteData.currentConditions?.[0];
  const forecastGroup = data.siteData.forecastGroup?.[0];

  return {
    current: {
      station: current?.station?.[0]?._,
      datetime: current?.dateTime?.find(dt => dt.$.name === 'observation')?.text?.[0],
      temperature: current?.temperature?.[0]?.['_'],
      units_temperature: current?.temperature?.[0]?.$?.units,
      condition: current?.condition?.[0],
      iconCode: current?.iconCode?.[0]?._,
      humidity: current?.relativeHumidity?.[0]?._,
      wind_speed: current?.wind?.[0]?.speed?.[0]?._,
      wind_speed_units: current?.wind?.[0]?.speed?.[0]?.$?.units,
      wind_direction: current?.wind?.[0]?.direction?.[0]?._,
      pressure: current?.pressure?.[0]?.['_'],
      pressure_units: current?.pressure?.[0]?.$?.units,
      pressure_tendency: current?.pressure?.[0]?.$?.tendency,
      visibility: current?.visibility?.[0]?._,
      visibility_units: current?.visibility?.[0]?.$?.units,
    },
    forecast: forecastGroup?.forecast?.map(f => ({
      period: f.period?.[0]?.$?.textForecastName,
      textSummary: f.textSummary?.[0],
      iconCode: f.abbreviatedForecast?.[0]?.iconCode?.[0]?._,
      temperatures: f.temperatures?.[0], // Keep full temp object if needed
      precipitation: f.precipitation?.[0],
      winds: f.winds?.[0], // Keep full wind object
    }))
  };
}

// Fetch historical data via GeoMet
async function fetchHistorical(lat, lon, days = 3) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);

  // Format dates as YYYY-MM-DDTHH:MM:SSZ
  const isoStart = start.toISOString().split('.')[0] + "Z";
  const isoEnd = end.toISOString().split('.')[0] + "Z";

  // GeoMet expects lon,lat,lon,lat for bbox
  const lonMin = (lon - 0.1).toFixed(4);
  const latMin = (lat - 0.1).toFixed(4);
  const lonMax = (lon + 0.1).toFixed(4);
  const latMax = (lat + 0.1).toFixed(4);

  const url = `https://api.weather.gc.ca/collections/climate-hourly-observations/items?datetime=${isoStart}/${isoEnd}&bbox=${lonMin},${latMin},${lonMax},${latMax}&limit=1000&f=json`;
  console.log(`Fetching historical from GeoMet: ${url}`);
  const data = await getJSON(url);
  return data.features?.map(f => f.properties) || [];
}

// Optional: Air Quality Health Index (AQHI)
async function fetchAQHI(lat, lon) {
  const lonMin = (lon - 0.1).toFixed(4);
  const latMin = (lat - 0.1).toFixed(4);
  const lonMax = (lon + 0.1).toFixed(4);
  const latMax = (lat + 0.1).toFixed(4);
  const url = `https://api.weather.gc.ca/collections/air-quality-health-index-observations/items?bbox=${lonMin},${latMin},${lonMax},${latMax}&limit=1&f=json`;
  console.log(`Fetching AQHI from GeoMet: ${url}`);
  try {
    const data = await getJSON(url);
    return data.features?.[0]?.properties || null;
  } catch (error) {
    console.error("AQHI fetch error:", error.message);
    return { error: "Failed to fetch AQHI data", details: error.message };
  }
}

// Optional: Radar metadata reference
function radarLayerInfo(lat, lon) {
  // Example BBOX for Quebec City area. This should be dynamically adjusted if possible.
  const qcLatMin = 46.0;
  const qcLonMin = -72.0;
  const qcLatMax = 47.5;
  const qcLonMax = -70.5;
  return {
    note: "Radar imagery available via GeoMet WMS endpoint. BBOX needs to be adjusted for actual location.",
    wms_example: `https://geo.weather.gc.ca/geomet?service=WMS&version=1.3.0&request=GetMap&layers=RADAR_1KM_RRAI&bbox=${qcLonMin},${qcLatMin},${qcLonMax},${qcLatMax}&width=600&height=400&crs=EPSG:4326&format=image/png`
  };
}

// Main API route
router.get('/api/ec-weather', async (req, res) => {
  const lat = parseFloat(req.query.lat || '46.8139'); // Default to Quebec City area
  const lon = parseFloat(req.query.lon || '-71.208');
  const days = parseInt(req.query.days || '2'); // Default to 2 days historical to match previous behavior

  console.log(`EC Weather request for lat: ${lat}, lon: ${lon}, days: ${days}`);

  const stationId = guessStation(lat, lon);

  try {
    // Execute all fetches in parallel
    const [realtimeData, historicalData, aqhiData] = await Promise.all([
      fetchCurrentAndForecast(stationId).catch(e => { console.error("Error fetching current/forecast:", e.message); return { error: e.message }; }),
      fetchHistorical(lat, lon, days).catch(e => { console.error("Error fetching historical:", e.message); return { error: e.message }; }),
      fetchAQHI(lat, lon) // Already has internal catch
    ]);

    const output = {
      metadata: {
        location: { lat, lon },
        stationId_used_for_current_forecast: stationId,
        historical_bbox: `${(lon - 0.1).toFixed(4)},${(lat - 0.1).toFixed(4)},${(lon + 0.1).toFixed(4)},${(lat + 0.1).toFixed(4)}`,
        aqhi_bbox: `${(lon - 0.1).toFixed(4)},${(lat - 0.1).toFixed(4)},${(lon + 0.1).toFixed(4)},${(lat + 0.1).toFixed(4)}`,
        fetched_at: new Date().toISOString()
      },
      current_conditions: realtimeData.current || realtimeData, // if error, realtimeData is {error: ...}
      forecasts: realtimeData.forecast || null,
      historical_observations: historicalData,
      air_quality_health_index: aqhiData,
      radar_info: radarLayerInfo(lat, lon)
    };

    res.json(output);
  } catch (err) {
    console.error('Main EC weather processing error:', err);
    res.status(500).json({ error: 'Failed to fetch Environment Canada weather data', details: err.message });
  }
});

module.exports = router;
