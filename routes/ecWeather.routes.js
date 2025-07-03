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
  // The city codes like 'qc-133' for Quebec City are commonly used.
  if (Math.abs(lat - 46.81) < 0.1 && Math.abs(lon - (-71.20)) < 0.1) {
    return 'qc-133'; // Quebec City site code
  }
  // Default or throw error if no match - using Quebec City as default for now
  return 'qc-133'; // Fallback for now
}

// Fetch current conditions from GeoMet SWOB and forecast from EC XML (forecast part will likely still fail)
async function fetchCurrentAndForecast(siteCode, lat, lon) { 
  let currentConditionsData = null;
  let forecastData = null;

  // 1. Fetch Current Conditions from GeoMet SWOB
  try {
    const lonMin = (lon - 0.1).toFixed(4);
    const latMin = (lat - 0.1).toFixed(4);
    const lonMax = (lon + 0.1).toFixed(4);
    const latMax = (lat + 0.1).toFixed(4);
    // Get data for the last few hours and sort by time to get the latest reliable one.
    // datetime=PT2H gets data from the last 2 hours. Or use a limit and sort.
    // For simplicity, let's try to get the latest single observation within a small bbox.
    // Removed sortby due to "bad sort property" error. Will rely on limit=1 and tight bbox for now.
    const swobUrl = `https://api.weather.gc.ca/collections/swob-realtime/items?bbox=${lonMin},${latMin},${lonMax},${latMax}&limit=1&f=json`;
    console.log(`Fetching current conditions from GeoMet SWOB (no sortby): ${swobUrl}`);
    const swobResult = await getJSON(swobUrl);
    if (swobResult.features && swobResult.features.length > 0) {
      const latestObs = swobResult.features[0].properties;
      currentConditionsData = {
        station: latestObs['stn_nam-value'] || latestObs.STATION_NAME, // Prefer specific, fallback to general
        datetime: latestObs['obs_date_tm'] || latestObs.OBSERVATION_DATE_TIME_UTC, // This is UTC
        temperature: latestObs['air_temp-value'], 
        units_temperature: latestObs['air_temp-uom'],
        condition: latestObs['weather-value'] || latestObs.WEATHER_EN, // Check for 'weather-value' or 'WEATHER_EN'
        // humidity: latestObs['rel_hum-value'], // Example
        // wind_speed: latestObs['avg_wnd_spd_10m_pst1mt-value'], // Example for 1-min avg wind speed
        // pressure: latestObs.MEAN_SEA_LEVEL_PRES_HPA, // Example, verify field
        raw_swob_properties: latestObs // Include all props for now for inspection by user
      };
    } else {
      console.log("No SWOB current conditions features found for the location.");
      currentConditionsData = { error: "No SWOB current conditions features found." };
    }
  } catch (e) {
    console.error("Error fetching SWOB current conditions:", e.message);
    currentConditionsData = { error: `Failed to fetch SWOB current conditions: ${e.message}` };
  }

  // 2. Attempt to Fetch Forecast from XML (will likely still fail, but keep for now)
  try {
    const xmlUrl = `https://dd.meteo.gc.ca/citypage_weather/xml/QC/${siteCode}_e.xml`;
    console.log(`NEW_LOG_V3: Fetching current and forecast from EC XML (dd.meteo.gc.ca): ${xmlUrl}`);
    const xmlData = await getXML(xmlUrl);
    const forecastGroup = xmlData.siteData.forecastGroup?.[0];
    forecastData = forecastGroup?.forecast?.map(f => ({
        period: f.period?.[0]?.$?.textForecastName,
        textSummary: f.textSummary?.[0],
        iconCode: f.abbreviatedForecast?.[0]?.iconCode?.[0]?._,
        temperatures: f.temperatures?.[0],
        precipitation: f.precipitation?.[0],
        winds: f.winds?.[0],
      }));
    // If current conditions were not available from SWOB, try to get them from XML as a fallback (if XML worked)
    if (!currentConditionsData || currentConditionsData.error) {
        const currentFromXml = xmlData.siteData.currentConditions?.[0];
        if (currentFromXml) {
            currentConditionsData = {
                station: currentFromXml?.station?.[0]?._,
                datetime: currentFromXml?.dateTime?.find(dt => dt.$.name === 'observation')?.text?.[0],
                temperature: currentFromXml?.temperature?.[0]?.['_'],
                units_temperature: currentFromXml?.temperature?.[0]?.$?.units,
                condition: currentFromXml?.condition?.[0],
                // ... map other fields ...
            };
        }
    }

  } catch (e) {
    console.error("Error fetching XML forecast:", e.message);
    if (!forecastData) forecastData = { error: `Failed to fetch XML forecast: ${e.message}` };
    // If current conditions from SWOB also failed, and XML failed, this will be the error for current too.
    if (!currentConditionsData || currentConditionsData.error) {
        currentConditionsData = { error: `Failed to fetch current conditions from XML: ${e.message}` };
    }
  }

  return {
    current: currentConditionsData,
    forecast: forecastData
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

  const url = `https://api.weather.gc.ca/collections/climate-hourly/items?datetime=${isoStart}/${isoEnd}&bbox=${lonMin},${latMin},${lonMax},${latMax}&limit=1000&f=json`;
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
  const url = `https://api.weather.gc.ca/collections/aqhi-observations-realtime/items?bbox=${lonMin},${latMin},${lonMax},${latMax}&limit=1&f=json`;
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
      fetchCurrentAndForecast(stationId, lat, lon).catch(e => { console.error("Error fetching current/forecast:", e.message); return { error: e.message }; }), // Pass lat, lon
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