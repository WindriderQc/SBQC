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

// New marker variables
let closestApproachMarker = {
    visible: false,
    lat: 0,
    lon: 0,
    alt: 0 // Store altitude if available/needed for positioning
};
// No specific global needed for end-of-path marker as it's derived from internalPredictedPath


// Constants for sizes and distances
const earthSize = 300;
const earthActualRadiusKM = 6371; 
const issDistanceToEarth = 50; 
const gpsSize = 5; 
const issSize = 6; 
const CYLINDER_VISUAL_LENGTH = issDistanceToEarth * 3; // Now correctly uses defined constants

// Constants for marker appearance
const MARKER_COLOR_TEAL = [0, 128, 128]; // Teal
const MARKER_COLOR_GREEN = [0, 200, 0]; // Green (matching predicted path)
const USER_LOCATION_MARKER_SIZE = gpsSize;
const CLOSEST_APPROACH_MARKER_SIZE = USER_LOCATION_MARKER_SIZE;
const END_OF_PATH_MARKER_SIZE = USER_LOCATION_MARKER_SIZE / 2;


// Global variables for the p5.js sketch (ensure these are below all const declarations they might depend on)
// ... (rest of variable declarations like sketchPassByRadiusKM are effectively here or remain where they are if not dependent)
let sketchPassByRadiusKM = 1500; // Default pass-by radius in KM, will be updated by slider

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
    
    let currentDisplayLat = (typeof window.clientLat === 'number' && window.clientLat !== null) ? window.clientLat : 46.8139; 
    let currentDisplayLon = (typeof window.clientLon === 'number' && window.clientLon !== null) ? window.clientLon : -71.2080;

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
    
    // Use currentDisplayLat, currentDisplayLon for the client location marker
    let pClientLoc = Tools.p5.getSphereCoord(earthSize, currentDisplayLat, currentDisplayLon); 
    push(); 
    translate(pClientLoc.x, pClientLoc.y, pClientLoc.z);
    noStroke(); 
    fill(255, 255, 0); 
    sphere(gpsSize);
    pop();

    // --- DIAGNOSTIC LINE REMOVED ---

    // Draw Closest Approach Marker (Teal)
    if (window.ISSOrbitPredictor && typeof window.ISSOrbitPredictor.getClosestApproachDetails === 'function') {
        const approachDetails = window.ISSOrbitPredictor.getClosestApproachDetails();
        if (approachDetails) {
            // Ensure approachDetails has lat, lon. alt might be optional or used if available.
            // The ISS path is drawn at earthSize + issDistanceToEarth.
            // The closest approach point should also be at this altitude relative to Earth's surface.
            let vApproach = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, approachDetails.lat, approachDetails.lon);
            push();
            translate(vApproach.x, vApproach.y, vApproach.z);
            noStroke();
            fill(MARKER_COLOR_TEAL[0], MARKER_COLOR_TEAL[1], MARKER_COLOR_TEAL[2]); // Use defined Teal color
            sphere(CLOSEST_APPROACH_MARKER_SIZE); // Use defined size
            pop();
        }
    }

    // Draw End of Prediction Path Marker (Green)
    if (internalPredictedPath && internalPredictedPath.length > 0) {
        const lastPoint = internalPredictedPath[internalPredictedPath.length - 1];
        // Ensure lastPoint has lat, lon.
        // Similar to the closest approach marker, position it relative to Earth's surface.
        let vEndPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, lastPoint.lat, lastPoint.lon);
        push();
        translate(vEndPath.x, vEndPath.y, vEndPath.z);
        noStroke();
        fill(MARKER_COLOR_GREEN[0], MARKER_COLOR_GREEN[1], MARKER_COLOR_GREEN[2]); // Use defined Green color
        sphere(END_OF_PATH_MARKER_SIZE); // Use defined size
        pop();
    }

    // Draw Pass-by Detection Cylinder (Standard Alignment)
    if (sketchPassByRadiusKM > 0) {
        const detectionRadius3DUnits = (sketchPassByRadiusKM / earthActualRadiusKM) * earthSize;
       
        let directionVector = pClientLoc.copy().normalize(); 
        let defaultCylinderAxis = createVector(0, -1, 0); // p5.js cylinder's height is along its local Y-axis
        
        let rotationAngle = defaultCylinderAxis.angleBetween(directionVector);
        let rotationAxis = defaultCylinderAxis.cross(directionVector);

        if (rotationAxis.magSq() < 0.0001) { 
            if (defaultCylinderAxis.dot(directionVector) < 0) { 
                rotationAngle = 0;//PI;
                rotationAxis = createVector(1, 0, 0); 
            } else {
                rotationAngle = 0;
            }
        }
        
        push(); // Start a new context for the cylinder
          
        
       // 1. Translate to where the BASE of the cylinder should be.
        translate(pClientLoc.x, pClientLoc.y, pClientLoc.z);

      
        // 2. Apply the orientation rotation `q` (aligns local Y with upVector).
        //    (This is the block with defaultCylinderAxis, angleBetween, cross, rotate)
        if (rotationAngle !== 0 && rotationAxis.magSq() > 0.0001) {
            rotate(rotationAngle, rotationAxis);
        }
        
        // 3. Translate UP along the NEW Y-axis (which is now upVector) by HALF the cylinder's desired visual height.
        translate(0, -CYLINDER_VISUAL_LENGTH / 2, 0);

        // 4. Draw the cylinder using standard (radius, height) parameters.
        fill(0, 100, 255, 30);
        noStroke();
        cylinder(detectionRadius3DUnits, CYLINDER_VISUAL_LENGTH);
        //drawAxis(500);
        pop();
    }

    show3DQuakes();

    // Note: The pop(); that was here, which matched the second rotateY group, is removed.
    // All elements are now part of the single main rotation group.
    pop(); // Matching pop for the main rotateY context (the one applied to all elements)
}


function drawAxis(len, width = 2) {  //  TODO : that should be in the tools.p5 section
  strokeWeight(width);

  // X axis - red
  stroke(255, 0, 0);
  line(0, 0, 0, len, 0, 0);

  // Y axis - green
  stroke(0, 255, 0);
  line(0, 0, 0, 0, len, 0);

  // Z axis - blue
  stroke(0, 0, 255);
  line(0, 0, 0, 0, 0, len);
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
