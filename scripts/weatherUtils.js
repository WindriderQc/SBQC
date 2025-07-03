const fetch = require('node-fetch');

// Helper to fetch and parse JSON
const getJSON = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch JSON from ${url}. Status: ${response.status}, Body: ${errorText}`);
    }
    return response.json();
};

// Fetch historical data via GeoMet
async function fetchHistorical(lat, lon, days = 2) { // Defaulted days to 2 to match original usage
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
  console.log(`Fetching EC historical from GeoMet: ${url}`);
  try {
    const data = await getJSON(url);
    // Extract relevant fields for temperature and pressure, if available
    // This function currently returns all properties.
    // For the /pressure endpoint, we'll be interested in TEMP and STATION_PRESSURE or similar.
    // The calling function in api.routes.js will need to map these.
    return data.features?.map(f => f.properties) || [];
  } catch (error) {
    console.error(`Error fetching EC historical data for lat:${lat}, lon:${lon}: ${error.message}`);
    return []; // Return empty array or throw error, depending on desired error handling
  }
}

module.exports = {
  fetchHistorical,
  // getJSON is not exported as it's a local helper for fetchHistorical here.
  // If other utilities need it, it could be exported or defined in a more general utils file.
};
