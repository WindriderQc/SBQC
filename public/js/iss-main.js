import * as predictor from './issOrbitPredictor.js';
import * as sketch from './issDetector.js';

// Page UI and Socket.IO Logic
let clientLat = null;
let clientLon = null;
let lastPassByCheckTime = 0;
const PASS_BY_CHECK_INTERVAL = 30000;

const socket = io();

socket.on('connect', () => {
    console.log('Connected to server via Socket.IO');
});

socket.on('iss', (data) => {
    window.iss = data;

    if (document.getElementById('isslat') && document.getElementById('isslon')) {
        document.getElementById('isslat').textContent = parseFloat(data.latitude).toFixed(2);
        document.getElementById('isslon').textContent = parseFloat(data.longitude).toFixed(2);
    }

    const now = Date.now();
    if (clientLat !== null && clientLon !== null && now - lastPassByCheckTime > PASS_BY_CHECK_INTERVAL) {
        // Prediction is triggered by sliders or initially.
        lastPassByCheckTime = now;
    }
});

async function fetchWeatherForCoords(lat, lon) {
    if (!lat || !lon) return;
    const url = `/api/weather/${lat},${lon}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Weather API request failed with status ${response.status}`);
        const data = await response.json();
        document.getElementById('summary').textContent = data.weather.weather[0].description;
        document.getElementById('temp').textContent = data.weather.main.feels_like.toFixed(1);
        if (data.air_quality && data.air_quality.results && data.air_quality.results[0] && data.air_quality.results[0].latest) {
            const air = data.air_quality.results[0];
            document.getElementById('aq_parameter').textContent = air.parameter ? air.parameter.displayName : 'N/A';
            document.getElementById('aq_value').textContent = air.latest.value;
            document.getElementById('aq_units').textContent = air.parameter ? air.parameter.units : '';
            document.getElementById('aq_date').textContent = air.latest.datetime && air.latest.datetime.local ? air.latest.datetime.local : 'N/A';
        } else { document.getElementById('aq_value').textContent = 'NO READING'; }
        const wind = data.weather.wind;
        document.getElementById('wind-speed').textContent = wind.speed;
        document.getElementById('wind-gust').textContent = wind.gust || 'N/A';
    } catch (e) {
        console.error('Error fetching weather data:', e);
        document.getElementById('summary').textContent = 'Error';
        document.getElementById('temp').textContent = 'N/A';
        document.getElementById('aq_value').textContent = 'NO READING';
    }
}

async function setDefaultLocationAndFetchWeather() {
    console.log("Using default client location (Quebec City area).");
    clientLat = 46.8139; clientLon = -71.2080;
    document.getElementById('clat').textContent = clientLat.toFixed(2);
    document.getElementById('clon').textContent = clientLon.toFixed(2);
    document.getElementById('default-location-msg').style.display = 'block';
    await fetchWeatherForCoords(clientLat, clientLon);
    predictor.setTargetLatLon(clientLat, clientLon);
    const targetLocSpan_def = document.getElementById('iss-target-loc');
    if (targetLocSpan_def) targetLocSpan_def.textContent = `${clientLat.toFixed(2)}, ${clientLon.toFixed(2)}`;
}

async function updateGeoData() {
    if (typeof Tools === 'undefined' || !Tools.isGeoLocAvailable || !Tools.geoLocate) {
        console.log("Tools.js not available or complete. Using default location.");
        await setDefaultLocationAndFetchWeather(); return;
    }
    if (!Tools.isGeoLocAvailable()) {
        console.log("Geolocation not available in this browser.");
        await setDefaultLocationAndFetchWeather(); return;
    }
    try {
        console.log("Attempting to get live geolocation...");
        const { coords } = await Tools.geoLocate();
        clientLat = coords.latitude; clientLon = coords.longitude;
        console.log("Live geolocation successful:", clientLat, clientLon);
        document.getElementById('default-location-msg').style.display = 'none';
        document.getElementById('clat').textContent = clientLat.toFixed(2);
        document.getElementById('clon').textContent = clientLon.toFixed(2);
        await fetchWeatherForCoords(clientLat, clientLon);
        predictor.setTargetLatLon(clientLat, clientLon);
        const targetLocSpan_live = document.getElementById('iss-target-loc');
        if (targetLocSpan_live) targetLocSpan_live.textContent = `${clientLat.toFixed(2)}, ${clientLon.toFixed(2)}`;
    } catch (e) {
        console.warn('Error getting live geolocation or permission denied:', e.message);
        await setDefaultLocationAndFetchWeather();
    }
}

const p5Sketch = (p) => {
    p.preload = sketch.preload;
    p.setup = sketch.setup;
    p.draw = sketch.draw;
    p.windowResized = sketch.windowResized;
    p.keyPressed = sketch.keyPressed;
    p.mouseDragged = sketch.mouseDragged;
    p.mouseWheel = sketch.mouseWheel;
    p.touchStarted = sketch.touchStarted;
    p.touchMoved = sketch.touchMoved;
};

document.addEventListener('DOMContentLoaded', () => {
    updateGeoData();

    // Initialize p5.js in instance mode
    new p5(p5Sketch, 'sketch-holder');

    const pathLengthSlider = document.getElementById('pathLengthSlider');
    const pathLengthValueSpan = document.getElementById('pathLengthValue');
    const predictionLengthSlider = document.getElementById('predictionLengthSlider');
    const predictionLengthValueSpan = document.getElementById('predictionLengthValue');
    const passByRadiusSlider = document.getElementById('passByRadiusSlider');
    const passByRadiusValueSpan = document.getElementById('passByRadiusValue');

    if (pathLengthSlider && pathLengthValueSpan) {
        pathLengthSlider.addEventListener('input', function() {
            pathLengthValueSpan.textContent = this.value;
            sketch.set3DMaxHistoryPoints(parseInt(this.value));
        });
    }

    if (predictionLengthSlider && predictionLengthValueSpan) {
        predictionLengthSlider.addEventListener('input', function() {
            predictionLengthValueSpan.textContent = this.value;
            predictor.setPredictionDurationSec(parseInt(this.value) * 60);
        });
    }

    if (passByRadiusSlider && passByRadiusValueSpan) {
        passByRadiusSlider.addEventListener('input', function() {
            passByRadiusValueSpan.textContent = this.value;
            predictor.setRadiusKM(parseInt(this.value));
            sketch.setSketchPassByRadiusKM(parseInt(this.value));
        });
    }

    predictor.fetchAndPredict();

    const targetLocSpan = document.getElementById('iss-target-loc');
    if (targetLocSpan) {
        const t = predictor.getTargetLatLon();
        targetLocSpan.textContent = `${t.lat.toFixed(2)}, ${t.lon.toFixed(2)}`;
    }

    const refreshBtn = document.getElementById('refresh-tle-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async function() {
            const passSpan = document.getElementById('iss-passby-time');
            const origText = passSpan ? passSpan.textContent : '';
            if (passSpan) passSpan.textContent = 'Refreshing TLE...';
            this.disabled = true;
            this.textContent = 'Refreshing...';
            try {
                const ok = await predictor.refreshTLEAndPredict();
                if (!ok && passSpan) passSpan.textContent = 'Failed to refresh TLE';
                if (targetLocSpan) {
                    const t = predictor.getTargetLatLon();
                    targetLocSpan.textContent = `${t.lat.toFixed(2)}, ${t.lon.toFixed(2)}`;
                }
            } catch (e) {
                console.error('Error refreshing TLE:', e);
            } finally {
                this.disabled = false;
                this.textContent = 'Refresh TLE';
                if (passSpan && passSpan.textContent === 'Refreshing TLE...') passSpan.textContent = origText;
            }
        });
    }

    // Quake appearance controls are not part of the refactoring for now.
    // They will be handled by the global p5 instance.

    // Visibility checkbox handlers
    const showIssHistoricalPathCheckbox = document.getElementById('showIssHistoricalPath');
    const showIssPredictedPathCheckbox = document.getElementById('showIssPredictedPath');
    const showQuakesCheckbox = document.getElementById('showQuakes');

    if (showIssHistoricalPathCheckbox) {
        showIssHistoricalPathCheckbox.addEventListener('change', function() {
            sketch.setShowIssHistoricalPath(this.checked);
        });
    }

    if (showIssPredictedPathCheckbox) {
        showIssPredictedPathCheckbox.addEventListener('change', function() {
            sketch.setShowIssPredictedPath(this.checked);
        });
    }

    if (showQuakesCheckbox) {
        showQuakesCheckbox.addEventListener('change', function() {
            sketch.setShowQuakes(this.checked);
        });
    }
});