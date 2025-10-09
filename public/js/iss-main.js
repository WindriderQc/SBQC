import * as predictor from './issOrbitPredictor.js';
import { setOnPathUpdate } from './issOrbitPredictor.js';

document.addEventListener('DOMContentLoaded', () => {
    // This is the bridge that connects the predictor's data to the sketch.
    // It's set up before the sketch is initialized to avoid race conditions.
    setOnPathUpdate((pathData) => {
        if (window.p5SketchApi && typeof window.p5SketchApi.update3DPredictedPath === 'function') {
            window.p5SketchApi.update3DPredictedPath(pathData);
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
    const refreshBtn = document.getElementById('refresh-tle-btn');

    pathLengthSlider.addEventListener('input', (e) => {
        pathLengthValueSpan.textContent = e.target.value;
        if (window.p5SketchApi) window.p5SketchApi.set3DMaxHistoryPoints(parseInt(e.target.value));
    });

    predictionLengthSlider.addEventListener('input', (e) => {
        predictionLengthValueSpan.textContent = e.target.value;
        predictor.setPredictionDurationSec(parseInt(e.target.value) * 60);
    });

    passByRadiusSlider.addEventListener('input', (e) => {
        passByRadiusValueSpan.textContent = e.target.value;
        predictor.setRadiusKM(parseInt(e.target.value));
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

    refreshBtn.addEventListener('click', () => {
        predictor.refreshTLE();
    });

    // Initial prediction
    predictor.fetchAndPredict();
});