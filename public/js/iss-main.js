import {
    fetchAndPredict,
    setOnPathUpdate,
    setOnPredictionUpdate,
    setPredictionDurationSec,
    setRadiusKM,
    refreshTLE
} from './issOrbitPredictor.js';

document.addEventListener('DOMContentLoaded', () => {
    const passbyTimeSpan = document.getElementById('iss-passby-time');

    // This is the bridge that connects the predictor's data to the sketch.
    // It's set up before the sketch is initialized to avoid race conditions.
    setOnPathUpdate((pathData) => {
        if (window.p5SketchApi && typeof window.p5SketchApi.update3DPredictedPath === 'function') {
            window.p5SketchApi.update3DPredictedPath(pathData);
        }
    });

    // Set up the callback for when the prediction data is updated
    setOnPredictionUpdate((details) => {
        if (details.closestPoint && details.closestPoint.time) {
            const passDate = new Date(Date.now() + details.closestPoint.time * 1000);
            // Using toLocaleString for a user-friendly format
            passbyTimeSpan.textContent = `${passDate.toLocaleString()}`;
        } else {
            passbyTimeSpan.textContent = 'No pass soon';
        }
    });

    // We need to dynamically import the sketch because it's not a default export anymore.
    import('./issDetector.js').then(module => {
        new p5(module.default, 'sketch-holder');
    });

    const socket = io();
    socket.on('iss', (data) => {
        window.iss = data;
    });

    // --- UI Control Logic ---
    const pathLengthSlider = document.getElementById('pathLengthSlider');
    const pathLengthValueSpan = document.getElementById('pathLengthValue');
    const predictionLengthSlider = document.getElementById('predictionLengthSlider');
    const predictionLengthValueSpan = document.getElementById('predictionLengthValue');
    const passByRadiusSlider = document.getElementById('passByRadiusSlider');
    const passByRadiusValueSpan = document.getElementById('passByRadiusValue');
    const showIssHistoricalPathCheckbox = document.getElementById('showIssHistoricalPath');
    const showIssPredictedPathCheckbox = document.getElementById('showIssPredictedPath');
    const showQuakesCheckbox = document.getElementById('showQuakes');
    const showIssCameraCheckbox = document.getElementById('showIssCamera');
    const issCameraControls = document.getElementById('iss-camera-controls');
    const issFovSlider = document.getElementById('issFovSlider');
    const issFovValueSpan = document.getElementById('issFovValue');
    const refreshBtn = document.getElementById('refresh-tle-btn');

    pathLengthSlider.addEventListener('input', (e) => {
        pathLengthValueSpan.textContent = e.target.value;
        if (window.p5SketchApi) window.p5SketchApi.set3DMaxHistoryPoints(parseInt(e.target.value));
    });

    predictionLengthSlider.addEventListener('input', (e) => {
        predictionLengthValueSpan.textContent = e.target.value;
        setPredictionDurationSec(parseInt(e.target.value) * 60);
    });

    passByRadiusSlider.addEventListener('input', (e) => {
        passByRadiusValueSpan.textContent = e.target.value;
        setRadiusKM(parseInt(e.target.value));
        if (window.p5SketchApi) window.p5SketchApi.setSketchPassByRadiusKM(parseInt(e.target.value));
    });

    showIssHistoricalPathCheckbox.addEventListener('change', (e) => {
        if (window.p5SketchApi) window.p5SketchApi.setShowIssHistoricalPath(e.target.checked);
    });

    showIssPredictedPathCheckbox.addEventListener('change', (e) => {
        if (window.p5SketchApi) window.p5SketchApi.setShowIssPredictedPath(e.target.checked);
    });

    showQuakesCheckbox.addEventListener('change', (e) => {
        if (window.p5SketchApi) window.p5SketchApi.setShowQuakes(e.target.checked);
    });

    showIssCameraCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        issCameraControls.style.display = isChecked ? 'block' : 'none';
        if (window.p5SketchApi) window.p5SketchApi.setShowIssCamera(isChecked);
    });

    issFovSlider.addEventListener('input', (e) => {
        const fov = parseInt(e.target.value, 10);
        issFovValueSpan.textContent = fov;
        if (window.p5SketchApi) window.p5SketchApi.setIssFov(fov);
    });

    refreshBtn.addEventListener('click', () => {
        refreshTLE();
    });

    // Initial prediction
    fetchAndPredict();
});