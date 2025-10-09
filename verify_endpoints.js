const fetch = require('node-fetch');

const endpoints = [
    { name: 'OpenWeatherMap', url: 'https://api.openweathermap.org/data/2.5/weather?lat=46.81&lon=-71.20&units=metric&APPID=' + process.env.WEATHER_API_KEY },
    { name: 'OpenAQ', url: 'https://api.openaq.org/v3/locations?coordinates=46.81,-71.20&radius=5000', options: { headers: { 'X-API-Key': process.env.OPENAQ_API_KEY } } },
    { name: 'WorldTides', url: 'https://www.worldtides.info/api/v3?heights&key=' + process.env.API_TIDES_KEY + '&lat=46.81&lon=-71.20&days=1' },
    { name: 'ipify', url: 'https://api64.ipify.org?format=json' },
    { name: 'ip-api', url: 'http://ip-api.com/json/' },
    { name: 'Celestrak', url: 'https://celestrak.com/NORAD/elements/stations.txt' },
    { name: 'Environment Canada (SWOB)', url: 'https://api.weather.gc.ca/collections/swob-realtime/items?bbox=-71.3,-46.7,-71.1,46.9&limit=1&f=json' },
    { name: 'Environment Canada (XML)', url: 'https://dd.meteo.gc.ca/citypage_weather/xml/QC/s0000430_e.xml' },
    { name: 'Environment Canada (GeoMet)', url: 'https://geo.weather.gc.ca/geomet' },
    { name: 'Data API', url: process.env.DATA_API_URL }
];

async function checkEndpoint(endpoint) {
    try {
        const response = await fetch(endpoint.url, endpoint.options || {});
        if (response.ok) {
            console.log(`[ SUCCESS ] ${endpoint.name} is available.`);
        } else {
            console.error(`[  ERROR  ] ${endpoint.name} is not available. Status: ${response.status}`);
        }
    } catch (error) {
        console.error(`[  ERROR  ] Failed to reach ${endpoint.name}: ${error.message}`);
    }
}

async function main() {
    console.log('--- Verifying External Endpoints ---');
    for (const endpoint of endpoints) {
        if (endpoint.url) {
            await checkEndpoint(endpoint);
        } else {
            console.warn(`[  WARN  ] ${endpoint.name} URL is not configured.`);
        }
    }
    console.log('--- Verification Complete ---');
}

main();