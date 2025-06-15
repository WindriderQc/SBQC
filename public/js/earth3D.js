// Global variables for the p5.js sketch
let internalIssPathHistory = [];
let MAX_HISTORY_POINTS = 4200; // Default value, can be changed by set3DMaxHistoryPoints
let originalLoadedIssHistory = []; // To store the full initial set of historical points

let internalPredictedPath = []; // For 3D predicted path visualization
const pathPointSphereSize = 2;

let rotationSpeed = (Math.PI * 2) / 60; // One full rotation every 60 seconds
let angle = 0; // Current rotation angle of the Earth

// p5.js assets
let cloudyEarth;
let earthquakes; // Data for earthquake visualization
let issGif;      // Texture for the ISS model

// Constants for sizes and distances
const earthSize = 300;
const gpsSize = 5; 
const issSize = 6; 
const issDistanceToEarth = 50;

// p5.js preload function: asynchronous loading of assets
function preload() {
    cloudyEarth = loadImage('/img/Planets/cloudyEarth.jpg');
    earthquakes = loadStrings('/data/quakes.csv'); // Load earthquake data
    issGif = loadImage('/img/iss.png');           // Load ISS texture
    // Fetch initial set of ISS historical data from the specified API
    loadJSON('https://data.specialblend.ca/iss', populateInitialIssHistory);
}

// p5.js setup function: initializes canvas and other setup tasks
function setup() {
    var canvas = createCanvas(1280, 720, WEBGL); // Create a WebGL canvas
    canvas.parent('sketch-holder'); // Attach canvas to a specific HTML div
}

// p5.js keyPressed function: handles keyboard inputs
function keyPressed() {
    if (key === 's' || key === 'S') { // Save canvas if 'S' key is pressed
        saveCanvas('earth3d_snapshot', 'png');
    }
}

// Function to update the maximum number of points for the historical ISS path
function set3DMaxHistoryPoints(newLimit) {
    console.log('[set3DMaxHistoryPoints] Called with newLimit:', newLimit, 'Current MAX_HISTORY_POINTS:', MAX_HISTORY_POINTS);
    console.log('[set3DMaxHistoryPoints] Typeof newLimit:', typeof newLimit);

    if (typeof newLimit !== 'number' || isNaN(newLimit) || newLimit < 0) {
        console.error('[set3DMaxHistoryPoints] Invalid newLimit provided. Value:', newLimit);
        return;
    }

    MAX_HISTORY_POINTS = newLimit; // Update global sketch variable
    console.log('[set3DMaxHistoryPoints] MAX_HISTORY_POINTS updated to:', MAX_HISTORY_POINTS);
    console.log('[set3DMaxHistoryPoints] originalLoadedIssHistory current length:', originalLoadedIssHistory.length);

    // Rebuild displayed history from the original full set
    if (originalLoadedIssHistory && originalLoadedIssHistory.length > 0) {
        let startIndex = Math.max(0, originalLoadedIssHistory.length - MAX_HISTORY_POINTS);
        console.log('[set3DMaxHistoryPoints] Calculated startIndex for slice:', startIndex, '(originalLength:', originalLoadedIssHistory.length, 'MAX_HISTORY_POINTS:', MAX_HISTORY_POINTS, ')');
        
        let newPathSlice = originalLoadedIssHistory.slice(startIndex);
        console.log('[set3DMaxHistoryPoints] Slice from originalLoadedIssHistory created. Slice length:', newPathSlice.length);
        
        internalIssPathHistory = newPathSlice; 
        console.log('[set3DMaxHistoryPoints] internalIssPathHistory has been updated. New length:', internalIssPathHistory.length);
    } else {
        internalIssPathHistory = []; 
        console.log('[set3DMaxHistoryPoints] originalLoadedIssHistory is empty or not available. internalIssPathHistory set to empty.');
    }
}

// Function to update the predicted ISS path for 3D visualization
function update3DPredictedPath(pointsFrom2D) {
    // console.log('[3D Path] update3DPredictedPath called. Received pointsFrom2D length:', pointsFrom2D ? pointsFrom2D.length : 'undefined/null');
    if (Array.isArray(pointsFrom2D)) {
        // Map points from {lat, lng} to {lat, lon} for consistency within the sketch
        internalPredictedPath = pointsFrom2D.map(p => ({ lat: p.lat, lon: p.lng })); 
        // console.log(`[3D Path] Updated internalPredictedPath with ${internalPredictedPath.length} points.`);
    } else {
        // console.warn('[3D Path] Invalid or no data received for update3DPredictedPath. Clearing predicted path.');
        internalPredictedPath = [];
    }
}

// Callback function to process the initially loaded ISS historical data
function populateInitialIssHistory(responseData) {
    console.log('[populateInitialIssHistory] Received historical ISS data. Points in data array:', responseData && responseData.data ? responseData.data.length : 'null/undefined');
    if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
        // Sort points by timestamp in ascending order
        let pointsToProcess = responseData.data.sort((a, b) => new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime());
        console.log('[populateInitialIssHistory] Sorted historical ISS data. Points available:', pointsToProcess.length);

        // Store all sorted points with a consistent structure ({lat, lon, timeStamp})
        originalLoadedIssHistory = pointsToProcess.map(p => ({
            lat: p.latitude,
            lon: p.longitude,
            timeStamp: p.timeStamp 
        }));
        console.log('[populateInitialIssHistory] Stored in originalLoadedIssHistory. Points:', originalLoadedIssHistory.length);
        
        // Initial population of the displayable history path
        let startIndex = Math.max(0, originalLoadedIssHistory.length - MAX_HISTORY_POINTS);
        internalIssPathHistory = originalLoadedIssHistory.slice(startIndex); // Get the most recent points
        console.log(`[populateInitialIssHistory] Initial internalIssPathHistory populated with ${internalIssPathHistory.length} points.`);

        // Notify other parts of the application if they depend on this data being ready
        if (typeof window.onHistoricalDataReadyForPrediction === 'function') {
            console.log('[populateInitialIssHistory] Historical data ready, calling onHistoricalDataReadyForPrediction().');
            window.onHistoricalDataReadyForPrediction();
        }
    } else {
        console.log('[populateInitialIssHistory] No valid historical ISS data found. Full response:', responseData);
        originalLoadedIssHistory = [];
        internalIssPathHistory = [];
    }
}

// p5.js draw function: runs continuously to render the scene
function draw() {
    // Log current state periodically for debugging
    if (typeof frameCount !== 'undefined' && frameCount % 60 === 1) { // p5.js global
        console.log(`[draw frameCount: ${frameCount}] internalIssPathHistory.length: ${internalIssPathHistory ? internalIssPathHistory.length : 'undefined'}, MAX_HISTORY_POINTS: ${MAX_HISTORY_POINTS}`);
    }

    background(52); // Set background color
    angle = (millis() / 1000) * rotationSpeed; // Update rotation angle based on time

    ambientLight(250); // Provide ambient illumination

    // Earth rendering
    push(); // Start a new drawing state for the Earth
    rotateY(angle); // Apply rotation
    texture(cloudyEarth); // Apply Earth texture
    noStroke(); // No outline for the sphere
    sphere(earthSize); // Draw the Earth sphere
    pop(); // Restore previous drawing state

    // ISS model, historical path, and predicted path rendering
    push(); // Start a new drawing state for orbiting elements
    rotateY(angle); // Apply the same rotation so elements orbit correctly with the Earth

    // Live ISS data handling (expects 'iss' global variable from page's Socket.IO)
    if (typeof iss !== 'undefined' && iss && typeof iss.latitude === 'number' && typeof iss.longitude === 'number') {
        let addPoint = true; // Flag to determine if the new point should be added
        // Check if the latest point in history is identical to the new one
        if (internalIssPathHistory.length > 0) {
            const lastPoint = internalIssPathHistory[internalIssPathHistory.length - 1];
            if (lastPoint.lat === iss.latitude && lastPoint.lon === iss.longitude) {
                addPoint = false; 
            }
        }

        if (addPoint) {
            // Add new ISS location to the history
            internalIssPathHistory.push({
                lat: iss.latitude,
                lon: iss.longitude,
                timeStamp: iss.timestamp ? iss.timestamp : new Date().getTime() // Use provided timestamp or current time
            });
        }
        // Trim history if it exceeds MAX_HISTORY_POINTS
        while (internalIssPathHistory.length > MAX_HISTORY_POINTS) {
            internalIssPathHistory.shift(); // Remove the oldest point
        }

        // Draw the ISS model
        let vISS = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, iss.latitude, iss.longitude);
        push();
        translate(vISS.x, vISS.y, vISS.z); // Move to ISS location
        if(issGif) { // If ISS texture is loaded
             texture(issGif);
             plane(issGif.width / issSize, issGif.height / issSize); // Draw as a textured plane
        } else {
            fill(255,0,0); // Fallback: draw as a red sphere
            sphere(5); 
        }
        pop();
    }

    // Draw Historical ISS Path (Orange Spheres)
    if (internalIssPathHistory && internalIssPathHistory.length > 0) {
        push();
        noStroke();
        fill(255, 165, 0, 150); // Orange, semi-transparent
        // Iterate through historical points and draw them
        for (let i = 0; i < internalIssPathHistory.length; i++) {
            const histPoint = internalIssPathHistory[i];
            if (histPoint && typeof histPoint.lat === 'number' && typeof histPoint.lon === 'number') {
                let vPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, histPoint.lat, histPoint.lon);
                push();
                translate(vPath.x, vPath.y, vPath.z);
                sphere(pathPointSphereSize);
                pop();
            }
        }
        pop();
    }

    // Draw Predicted ISS Path (Green Line)
    if (internalPredictedPath && internalPredictedPath.length > 1) {
        push();
        stroke(0, 200, 0, 180); // Green, semi-transparent
        strokeWeight(1.5);
        noFill(); // We're drawing a line, not a filled shape
        beginShape();
        // Iterate through predicted points and draw line segments
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
    
    // Default location marker (e.g., Quebec City)
    let pQC = Tools.p5.getSphereCoord(earthSize, 46.8139, -71.2080); // Coordinates for Quebec City
    push();
    translate(pQC.x, pQC.y, pQC.z);
    fill(255, 255, 0); // Yellow color for the marker
    sphere(gpsSize);
    pop();

    show3DQuakes(); // Render earthquake visualizations
    pop(); // Restore previous drawing state (end of context for orbiting elements)
}

// Function to display earthquakes on the 3D globe
function show3DQuakes() {
    if (!earthquakes || earthquakes.length === 0) return; // Do nothing if no earthquake data

    for (var i = 1; i < earthquakes.length; i++) { // Start from 1 to skip header row if present
        var data = earthquakes[i].split(/,/); // Split CSV line
        if (data.length < 5) continue; // Ensure enough data fields

        var lat = parseFloat(data[1]);
        var lon = parseFloat(data[2]);
        var mag = parseFloat(data[4]);

        if (isNaN(lat) || isNaN(lon) || isNaN(mag)) continue; // Skip if data is invalid

        // Convert lat/lon to 3D coordinates on the sphere's surface
        let pos = Tools.p5.getSphereCoord(earthSize, lat, lon); // Assumes Tools.p5.getSphereCoord is available

        // Scale magnitude for visual representation
        var h = pow(10, mag); // p5.js pow function
        var maxh = pow(10, 8); // Max expected magnitude effect for scaling
        h = map(h, 0, maxh, 1, Math.min(mag * 5, 100)); // p5.js map function, cap size

        // Determine color based on magnitude
        let fromColor = color(0, 255, 0, 150); // Green for low magnitude (p5.js color)
        let toColor = color(255, 0, 0, 150);   // Red for high magnitude (p5.js color)
        let quakeColor = lerpColor(fromColor, toColor, map(mag, 0, 8, 0, 1)); // p5.js lerpColor & map

        // Draw the earthquake marker
        push();
        translate(pos.x, pos.y, pos.z);
        fill(quakeColor);
        noStroke();
        sphere(Math.max(1, h / 10)); // Scale sphere size for visibility
        pop();
    }
}
