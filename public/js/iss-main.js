import * as predictor from './issOrbitPredictor.js';
import { setOnPathUpdate } from './issOrbitPredictor.js';

document.addEventListener('DOMContentLoaded', () => {
    // This is the bridge that connects the predictor's data to the sketch.
    // It's set up before the sketch is initialized to avoid race conditions.
    setOnPathUpdate((pathData) => {
        if (window.p5SketchApi && typeof window.p5SketchApi.update3DPredictedPath === 'function') {
            window.p5SketchApi.update3DPredictedPath(pathData);
        }
        
        // Update prediction slider max based on the approach time
        updatePredictionSliderMax();
    });

    // Function to dynamically adjust the prediction length slider max
    function updatePredictionSliderMax() {
        const predictionLengthSlider = document.getElementById('predictionLengthSlider');
        if (!predictionLengthSlider) return;
        
        try {
            const approachDetails = predictor.getClosestApproachDetails();
            if (approachDetails && typeof approachDetails.time === 'number') {
                // Convert approach time from seconds to minutes and add buffer
                const approachTimeMinutes = Math.ceil(approachDetails.time / 60);
                // Set max to approach time + 30 minutes buffer, with absolute minimum of 180 min
                const newMax = Math.max(180, approachTimeMinutes + 30);
                // Round up to nearest 30 minutes for cleaner values
                const roundedMax = Math.ceil(newMax / 30) * 30;
                
                predictionLengthSlider.max = roundedMax;
                
                // If current value exceeds new max, adjust it
                const currentValue = parseInt(predictionLengthSlider.value);
                if (currentValue > roundedMax) {
                    predictionLengthSlider.value = roundedMax;
                    const predictionLengthValueSpan = document.getElementById('predictionLengthValue');
                    if (predictionLengthValueSpan) {
                        predictionLengthValueSpan.textContent = roundedMax;
                    }
                    predictor.setPredictionDurationSec(roundedMax * 60);
                }
                
                console.log(`[iss-main] Updated prediction slider max to ${roundedMax} min (approach in ${approachTimeMinutes} min)`);
            }
        } catch (e) {
            console.warn('[iss-main] Could not update prediction slider max:', e);
        }
    }

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

    // Optional: Enable for debugging UI element detection
    // console.log('[iss-main] UI elements found:', {
    //     pathLengthSlider: !!pathLengthSlider,
    //     predictionLengthSlider: !!predictionLengthSlider,
    //     passByRadiusSlider: !!passByRadiusSlider,
    //     showIssHistoricalPathCheckbox: !!showIssHistoricalPathCheckbox,
    //     showIssPredictedPathCheckbox: !!showIssPredictedPathCheckbox,
    //     showQuakesCheckbox: !!showQuakesCheckbox,
    //     showIssCameraCheckbox: !!showIssCameraCheckbox,
    //     issFovSlider: !!issFovSlider,
    //     refreshBtn: !!refreshBtn
    // });

    if (pathLengthSlider) {
        pathLengthSlider.addEventListener('input', (e) => {
            pathLengthValueSpan.textContent = e.target.value;
            if (window.p5SketchApi) window.p5SketchApi.set3DMaxHistoryPoints(parseInt(e.target.value));
        });
    }

    if (predictionLengthSlider) {
        predictionLengthSlider.addEventListener('input', (e) => {
            predictionLengthValueSpan.textContent = e.target.value;
            predictor.setPredictionDurationSec(parseInt(e.target.value) * 60);
        });
    }

    if (passByRadiusSlider) {
        passByRadiusSlider.addEventListener('input', (e) => {
            passByRadiusValueSpan.textContent = e.target.value;
            predictor.setRadiusKM(parseInt(e.target.value));
            if (window.p5SketchApi) window.p5SketchApi.setSketchPassByRadiusKM(parseInt(e.target.value));
        });
    }

    if (showIssHistoricalPathCheckbox) {
        showIssHistoricalPathCheckbox.addEventListener('change', (e) => {
            if (window.p5SketchApi) window.p5SketchApi.setShowIssHistoricalPath(e.target.checked);
        });
    }

    if (showIssPredictedPathCheckbox) {
        showIssPredictedPathCheckbox.addEventListener('change', (e) => {
            if (window.p5SketchApi) window.p5SketchApi.setShowIssPredictedPath(e.target.checked);
        });
    }

    if (showQuakesCheckbox) {
        showQuakesCheckbox.addEventListener('change', (e) => {
            if (window.p5SketchApi) window.p5SketchApi.setShowQuakes(e.target.checked);
        });
    }

    if (showIssCameraCheckbox && issCameraControls) {
        showIssCameraCheckbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            issCameraControls.style.display = isChecked ? 'block' : 'none';
            if (window.p5SketchApi) window.p5SketchApi.setShowIssCamera(isChecked);
        });
    }

    if (issFovSlider && issFovValueSpan) {
        issFovSlider.addEventListener('input', (e) => {
            const fov = parseInt(e.target.value, 10);
            issFovValueSpan.textContent = fov;
            if (window.p5SketchApi) window.p5SketchApi.setIssFov(fov);
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            predictor.refreshTLE();
        });
    }

    // Initial prediction
    predictor.fetchAndPredict();
});