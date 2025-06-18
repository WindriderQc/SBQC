// Global variables for the p5.js sketch
let internalIssPathHistory = [];
let MAX_HISTORY_POINTS = 4200;
let originalLoadedIssHistory = [];

let internalPredictedPath = [];
const pathPointSphereSize = 2;

let autoRotationSpeed = (Math.PI * 2) / 120;
let angleY = 0; // Renamed from angle
let angleX = 0; // For vertical rotation
let zoomLevel = 1.0; // For mouse wheel zoom

let controlsOverlayElement; // To store reference to the controls overlay div

let cloudyEarth;
let earthquakes;
let issGif;

const earthSize = 300; // Visual radius of Earth in 3D units
const earthActualRadiusKM = 6371; // Actual radius of Earth in KM for scaling
let sketchPassByRadiusKM = 1500; // Default pass-by radius in KM, will be updated by slider

const gpsSize = 5;
const issSize = 6;
const issDistanceToEarth = 50;

function preload() {
    cloudyEarth = loadImage('/img/Planets/cloudyEarth.jpg');
    earthquakes = loadStrings('/data/quakes.csv');
    issGif = loadImage('/img/iss.png');
    loadJSON('https://data.specialblend.ca/iss', populateInitialIssHistory);
}

function setup() {
    var canvas = createCanvas(1280, 720, WEBGL);
    canvas.parent('sketch-holder');
    controlsOverlayElement = document.getElementById('controls-overlay');
}

function keyPressed() {
    if (key === 's' || key === 'S') {
        saveCanvas('earth3d_snapshot', 'png');
    }
}

function set3DMaxHistoryPoints(newLimit) {
    console.log('[set3DMaxHistoryPoints] Called with newLimit:', newLimit, 'Current MAX_HISTORY_POINTS:', MAX_HISTORY_POINTS);
    if (typeof newLimit !== 'number' || isNaN(newLimit) || newLimit < 0) {
        console.error('[set3DMaxHistoryPoints] Invalid newLimit provided. Value:', newLimit);
        return;
    }
    MAX_HISTORY_POINTS = newLimit;
    if (originalLoadedIssHistory && originalLoadedIssHistory.length > 0) {
        let startIndex = Math.max(0, originalLoadedIssHistory.length - MAX_HISTORY_POINTS);
        internalIssPathHistory = originalLoadedIssHistory.slice(startIndex);
    } else {
        internalIssPathHistory = [];
    }
    console.log('[set3DMaxHistoryPoints] internalIssPathHistory updated. New length:', internalIssPathHistory.length);
}

function update3DPredictedPath(pointsFrom2D) {
    console.log('[3D Path] update3DPredictedPath called. Received pointsFrom2D length:', pointsFrom2D ? pointsFrom2D.length : 'undefined/null');
    if (pointsFrom2D && pointsFrom2D.length > 0) {
        console.log('[3D Path] First 3 received pointsFrom2D for predicted path:', JSON.stringify(pointsFrom2D.slice(0, 3)));
    }

    if (Array.isArray(pointsFrom2D)) {
        internalPredictedPath = pointsFrom2D.map(p => ({ lat: p.lat, lon: p.lng }));
        console.log(`[3D Path] Updated internalPredictedPath. New length: ${internalPredictedPath.length}`);
        if (internalPredictedPath.length > 0) {
            console.log('[3D Path] First 3 internalPredictedPath points:', JSON.stringify(internalPredictedPath.slice(0,3)));
        }
    } else {
        console.warn('[3D Path] Invalid or no data received for update3DPredictedPath. Clearing internalPredictedPath.');
        internalPredictedPath = [];
    }
}

function setSketchPassByRadiusKM(newRadiusKM) {
    if (typeof newRadiusKM === 'number' && newRadiusKM >= 0) {
        sketchPassByRadiusKM = newRadiusKM;
        console.log('[earth3DSketch] sketchPassByRadiusKM updated to:', sketchPassByRadiusKM);
    }
}

function populateInitialIssHistory(responseData) {
    console.log('[populateInitialIssHistory] Received historical ISS data. Points in data array:', responseData && responseData.data ? responseData.data.length : 'null/undefined');
    if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
        let pointsToProcess = responseData.data.sort((a, b) => new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime());
        originalLoadedIssHistory = pointsToProcess.map(p => ({
            lat: p.latitude,
            lon: p.longitude,
            timeStamp: p.timeStamp
        }));
        let startIndex = Math.max(0, originalLoadedIssHistory.length - MAX_HISTORY_POINTS);
        internalIssPathHistory = originalLoadedIssHistory.slice(startIndex);
        console.log(`[populateInitialIssHistory] Initial internalIssPathHistory populated with ${internalIssPathHistory.length} points.`);
        if (typeof window.onHistoricalDataReadyForPrediction === 'function') {
            window.onHistoricalDataReadyForPrediction();
        }
    } else {
        originalLoadedIssHistory = [];
        internalIssPathHistory = [];
    }
}

function draw() {
    // Updated periodic log
    if (typeof frameCount !== 'undefined' && frameCount % 60 === 1) {
        console.log(`[draw frameCount: ${frameCount}] AngleY: ${angleY.toFixed(2)}, AngleX: ${angleX.toFixed(2)}, Zoom: ${zoomLevel.toFixed(2)}`);
    }

    background(52);

    // Normal angleY auto-rotation
    if (typeof autoRotationSpeed === 'number' && !isNaN(autoRotationSpeed)) {
        angleY += autoRotationSpeed / 60.0; // Assumes ~60 FPS
    } else {
        // console.warn("[draw] autoRotationSpeed is not a valid number:", autoRotationSpeed);
    }

    ambientLight(250);
    scale(zoomLevel); // Apply zoom

    push(); // Main push for all rotating elements
    rotateY(angleY); // Use dynamic angleY
    rotateX(angleX); // Use dynamic angleX

    // Earth rendering
    push(); // Optional inner push for Earth specific transforms if any, besides rotation
    texture(cloudyEarth);
    noStroke();
    sphere(earthSize);
    pop(); // End Earth's optional inner push

    // --- TEMPORARY TEST MARKER at (0,0) REMOVED ---
    // let testLat0Lon0 = { lat: 0, lon: 0 };
    // let pTest00 = Tools.p5.getSphereCoord(earthSize, testLat0Lon0.lat, testLat0Lon0.lon);
    // push();
    // translate(pTest00.x, pTest00.y, pTest00.z);
    // noStroke();
    // fill(255, 0, 0); // Bright Red
    // sphere(gpsSize * 1.5); // Slightly larger to be visible
    // pop();
    // --- END TEMPORARY TEST MARKER ---

    // ISS model, historical path, and predicted path rendering are now within this main rotation context
    // No additional rotateY(angle) should be applied to them individually.

    if (typeof window.iss !== 'undefined' && window.iss && typeof window.iss.latitude === 'number' && typeof window.iss.longitude === 'number') {
        let addPoint = true;
        if (internalIssPathHistory.length > 0) {
            const lastPoint = internalIssPathHistory[internalIssPathHistory.length - 1];
            if (lastPoint.lat === window.iss.latitude && lastPoint.lon === window.iss.longitude) addPoint = false;
        }
        if (addPoint) {
            internalIssPathHistory.push({ lat: window.iss.latitude, lon: window.iss.longitude, timeStamp: window.iss.timestamp ? window.iss.timestamp : new Date().getTime() });
        }
        while (internalIssPathHistory.length > MAX_HISTORY_POINTS) internalIssPathHistory.shift();

        let vISS = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, window.iss.latitude, window.iss.longitude);
        push();
        translate(vISS.x, vISS.y, vISS.z);
        if(issGif && issGif.width > 0 && issGif.height > 0) {
             noStroke();
             texture(issGif);
             plane(issGif.width / issSize, issGif.height / issSize);
        } else {
            noStroke();
            fill(255,0,0);
            sphere(5);
        }
        pop();
    }

    if (internalIssPathHistory && internalIssPathHistory.length > 0) {
        push();
        noStroke();
        fill(255, 165, 0, 150);
        for (let i = 0; i < internalIssPathHistory.length; i++) {
            const histPoint = internalIssPathHistory[i];
            if (histPoint && typeof histPoint.lat === 'number' && typeof histPoint.lon === 'number') {
                let vPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, histPoint.lat, histPoint.lon);
                push(); translate(vPath.x, vPath.y, vPath.z); sphere(pathPointSphereSize); pop();
            }
        }
        pop();
    }

    if (internalPredictedPath && internalPredictedPath.length > 1) {
        push();
        stroke(0, 200, 0, 180);
        strokeWeight(1.5);
        noFill();
        beginShape();
        for (let i = 0; i < internalPredictedPath.length; i++) {
            const predPoint = internalPredictedPath[i];
            if (typeof predPoint.lat === 'number' && typeof predPoint.lon === 'number') {
                let vPredPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, predPoint.lat, predPoint.lon);
                vertex(vPredPath.x, vPredPath.y, vPredPath.z);
            }
        }
        endShape();
        pop();
    }

    let qcLat = 46.8139;
    let qcLon = -71.2080;
    let pQC = Tools.p5.getSphereCoord(earthSize, qcLat, qcLon);
    push();
    translate(pQC.x, pQC.y, pQC.z);
    noStroke();
    fill(255, 255, 0);
    sphere(gpsSize);
    pop();

    if (sketchPassByRadiusKM > 0) {
        const detectionRadius3DUnits = (sketchPassByRadiusKM / earthActualRadiusKM) * earthSize;
        push();
        let detectionCenterPos = Tools.p5.getSphereCoord(earthSize, qcLat, qcLon);
        translate(detectionCenterPos.x, detectionCenterPos.y, detectionCenterPos.z);
        fill(0, 100, 255, 30);
        noStroke();
        sphere(detectionRadius3DUnits);
        pop();
    }

    show3DQuakes();
    // Note: The pop(); that was here, which matched the second rotateY group, is removed.
    // All elements are now part of the single main rotation group.
    pop(); // Matching pop for the main rotateY context (the one applied to all elements)
}

function show3DQuakes() {
    if (!earthquakes || earthquakes.length === 0) return;
    for (var i = 1; i < earthquakes.length; i++) {
        var data = earthquakes[i].split(/,/);
        if (data.length < 5) continue;
        var lat = parseFloat(data[1]); var lon = parseFloat(data[2]); var mag = parseFloat(data[4]);
        if (isNaN(lat) || isNaN(lon) || isNaN(mag)) continue;
        let pos = Tools.p5.getSphereCoord(earthSize, lat, lon);
        var h = pow(10, mag); var maxh = pow(10, 8);
        h = map(h, 0, maxh, 1, Math.min(mag * 5, 100));
        let fromColor = color(0, 255, 0, 150); let toColor = color(255, 0, 0, 150);
        let quakeColor = lerpColor(fromColor, toColor, map(mag, 0, 8, 0, 1));
        push(); translate(pos.x, pos.y, pos.z); fill(quakeColor); noStroke(); sphere(Math.max(1, h / 10)); pop();
    }
}

window.earth3DSketch = {
    setMaxHistoryPoints: set3DMaxHistoryPoints,
    updatePredictedPath: update3DPredictedPath,
    getInternalIssPathHistory: () => internalIssPathHistory,
    getMaxHistoryPoints: () => MAX_HISTORY_POINTS,
    setSketchPassByRadiusKM: setSketchPassByRadiusKM
};

function mouseDragged() {
    if (controlsOverlayElement &&
        mouseX >= controlsOverlayElement.offsetLeft && mouseX <= controlsOverlayElement.offsetLeft + controlsOverlayElement.offsetWidth &&
        mouseY >= controlsOverlayElement.offsetTop && mouseY <= controlsOverlayElement.offsetTop + controlsOverlayElement.offsetHeight) {
        // Mouse is over the overlay, allow default drag for sliders
        return; // Equivalent to returning true in p5 for allowing default behavior
    }

    // If not over the overlay, and mouse is within canvas bounds (original check)
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        let dx = mouseX - pmouseX;
        let dy = mouseY - pmouseY;
        angleY += dx * 0.01;
        angleX += dy * 0.01;
        angleX = constrain(angleX, -Math.PI/2.1, Math.PI/2.1);
        return false; // Prevent default browser drag behaviors ONLY when rotating globe
    }
}

function mouseWheel(event) {
    // Check if the mouse is within the canvas bounds
    // p5.js global variables 'width' and 'height' refer to canvas dimensions
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
        zoomLevel -= event.deltaY * 0.001 * zoomLevel;
        zoomLevel = constrain(zoomLevel, 0.2, 5.0);
        return false; // Prevent default scrolling ONLY if mouse is over canvas
    }
    // If mouse is not over canvas, allow default browser scrolling (do not return false, implicitly returns undefined)
}
