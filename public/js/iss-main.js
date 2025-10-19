import * as predictor from './issOrbitPredictor.js';
import { setOnPathUpdate } from './issOrbitPredictor.js';

document.addEventListener('DOMContentLoaded', () => {
    let initialPredictionSet = false; // Track if we've set the initial max value
    let isUpdatingPrediction = false; // Guard against recursive updates
    
    // This is the bridge that connects the predictor's data to the sketch.
    // It's set up before the sketch is initialized to avoid race conditions.
    setOnPathUpdate((pathData) => {
        if (window.p5SketchApi && window.p5SketchApi.predictedPath) {
            window.p5SketchApi.predictedPath.update(pathData);
        }
        
        // Update prediction slider max based on the approach time
        // Only call if we're not already in the middle of an update
        if (!isUpdatingPrediction) {
            updatePredictionSliderMax();
        }
    });

    // Function to dynamically adjust the prediction length slider max
    function updatePredictionSliderMax() {
        const predictionLengthSlider = document.getElementById('predictionLengthSlider');
        if (!predictionLengthSlider) return;
        
        // Prevent recursive calls
        if (isUpdatingPrediction) return;
        isUpdatingPrediction = true;
        
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
                
                // Only set to max on the first calculation, then let user control it
                if (!initialPredictionSet) {
                    predictionLengthSlider.value = roundedMax;
                    const predictionLengthValueSpan = document.getElementById('predictionLengthValue');
                    if (predictionLengthValueSpan) {
                        predictionLengthValueSpan.textContent = roundedMax;
                    }
                    initialPredictionSet = true;
                    console.log(`[iss-main] Initial prediction slider set to max ${roundedMax} min (approach in ${approachTimeMinutes} min)`);
                } else {
                    // After initial set, only adjust if current value exceeds new max
                    const currentValue = parseInt(predictionLengthSlider.value);
                    if (currentValue > roundedMax) {
                        predictionLengthSlider.value = roundedMax;
                        const predictionLengthValueSpan = document.getElementById('predictionLengthValue');
                        if (predictionLengthValueSpan) {
                            predictionLengthValueSpan.textContent = roundedMax;
                        }
                    }
                    console.log(`[iss-main] Updated prediction slider max to ${roundedMax} min`);
                }
            }
        } catch (e) {
            console.warn('[iss-main] Could not update prediction slider max:', e);
        } finally {
            // Always reset the guard flag
            isUpdatingPrediction = false;
        }
    }

    // We need to dynamically import the sketch because it's not a default export anymore.
    import('./issDetector.js').then(module => {
        new p5(module.default, 'sketch-holder');
        // The sketch API is set synchronously, but wait for next tick to ensure everything is ready
        setTimeout(() => {
            if (window.p5SketchApi && typeof window.p5SketchApi.update3DPredictedPath === 'function') {
                console.log('[iss-main] Sketch API ready, starting initial prediction');
                predictor.fetchAndPredict();
            } else {
                console.warn('[iss-main] Sketch API not ready after initialization');
            }
        }, 50);
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
    const showCloudCheckbox = document.getElementById('showCloud');
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
            
            // When earthquakes are enabled, disable cloud layer (earthquakes need to be visible on top)
            if (e.target.checked && showCloudCheckbox) {
                showCloudCheckbox.checked = false;
                if (window.p5SketchApi) window.p5SketchApi.setShowCloud(false);
            }
        });
    }

    if (showCloudCheckbox) {
        showCloudCheckbox.addEventListener('change', (e) => {
            if (window.p5SketchApi) window.p5SketchApi.setShowCloud(e.target.checked);
            
            // When cloud layer is enabled, disable earthquakes (cloud would hide them)
            if (e.target.checked && showQuakesCheckbox) {
                showQuakesCheckbox.checked = false;
                if (window.p5SketchApi) window.p5SketchApi.setShowQuakes(false);
            }
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
});