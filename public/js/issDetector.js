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

// Quake visualization parameters
let quakeFromColor;
let quakeToColor;
let quakeMagFactor = 1.0; // Default magnitude factor

// Visibility toggles
let showIssHistoricalPath = true;
let showIssPredictedPath = true;
let showQuakes = false; // Default: off

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


// Helper: normalize longitude to [-180, 180]
function normalizeLon(lon) {
    if (typeof lon !== 'number' || isNaN(lon)) return lon;
    // Wrap to 0..360 then shift to -180..180
    return ((lon + 180) % 360 + 360) % 360 - 180;
}


// Global variables for the p5.js sketch (ensure these are below all const declarations they might depend on)
// ... (rest of variable declarations like sketchPassByRadiusKM are effectively here or remain where they are if not dependent)
let sketchPassByRadiusKM = 1500; // Default pass-by radius in KM, will be updated by slider

// Toggle to show debug axes
let showAxis = false;

async function preload() {
    cloudyEarth = loadImage('/img/Planets/cloudyEarth.jpg');
    earthquakes = loadStrings('/data/quakes.csv');
    issGif = loadImage('/img/iss.png');
    try {
        const response = await fetch('/api/iss');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        populateInitialIssHistory(data);
    } catch(err) {
        console.error('[fetch error] Failed to load historical ISS data:', err);
    }
}

function setup() {
    const sketchHolder = document.getElementById('sketch-holder');
    const canvasWidth = sketchHolder.offsetWidth;
    const canvasHeight = canvasWidth * (9 / 16); // Maintain 16:9 aspect ratio
    var canvas = createCanvas(canvasWidth, canvasHeight, WEBGL);
    canvas.parent('sketch-holder');
    controlsOverlayElement = document.getElementById('controls-overlay');

    // Ensure the controls overlay is on top and can receive pointer events.
    // Some browsers / canvases can capture pointer events; make stacking explicit here.
    try {
        if (controlsOverlayElement) {
            controlsOverlayElement.style.pointerEvents = 'auto';
            controlsOverlayElement.style.zIndex = 2000; // higher than canvas
        }
        // p5 returns a p5.Element; set its underlying DOM element style to avoid it blocking overlay
        if (canvas && canvas.elt) {
            canvas.elt.style.zIndex = 1000; // ensure canvas sits below overlay
            // keep pointer events enabled on canvas so the globe remains interactive when not covered
            canvas.elt.style.pointerEvents = 'auto';
        }
    } catch (e) {
        console.warn('Could not adjust canvas/overlay z-index/pointer settings:', e);
    }

    // Prevent pointer/touch events on overlay controls from bubbling to the p5 canvas
    try {
        if (controlsOverlayElement) {
            // Attach conservative (non-passive) handlers to individual controls so we can
            // reliably stop propagation before the p5 canvas handlers run. Use
            // stopImmediatePropagation where available to prevent other listeners from
            // intercepting the pointer events.
            const controlEls = controlsOverlayElement.querySelectorAll('input, button, label');
            controlEls.forEach(el => {
                el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }, false);
                el.addEventListener('pointermove', (ev) => { ev.stopPropagation(); }, false);
                el.addEventListener('mousedown', (ev) => { ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }, false);
                el.addEventListener('touchstart', (ev) => { ev.stopPropagation(); }, false);
                el.addEventListener('touchmove', (ev) => { ev.stopPropagation(); }, false);
            });

            // Also guard the overlay container as a whole to catch events that may
            // bubble from custom controls or labels. We purposely do not call
            // preventDefault here since we want the browser's native control behavior
            // (dragging sliders, clicks) to proceed; we only stop the event from
            // propagating to the canvas and other global handlers.
            controlsOverlayElement.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }, false);
            controlsOverlayElement.addEventListener('mousedown', (ev) => { ev.stopPropagation(); if (ev.stopImmediatePropagation) ev.stopImmediatePropagation(); }, false);
            controlsOverlayElement.addEventListener('click', (ev) => { ev.stopPropagation(); }, false);

            // Workaround: Temporarily disable canvas pointer events while the user is
            // interacting with overlay controls. This prevents the p5/WebGL canvas
            // from capturing pointermove/mousemove during slider drags in Chrome/Windows.
            try {
                if (canvas && canvas.elt) {
                    let isControlActive = false;
                    controlsOverlayElement.addEventListener('pointerdown', (ev) => {
                        isControlActive = true;
                        try { canvas.elt.style.pointerEvents = 'none'; } catch (e) {}
                    }, false);
                    window.addEventListener('pointerup', (ev) => {
                        if (isControlActive) {
                            isControlActive = false;
                            try { canvas.elt.style.pointerEvents = 'auto'; } catch (e) {}
                        }
                    }, false);
                }
            } catch (e) {
                // Non-fatal; best-effort workaround
                console.warn('Could not attach canvas pointer-toggle workaround:', e);
            }
        }
    } catch (e) {
        // Non-fatal; input elements may not exist at this point in some race conditions
        console.warn('Could not attach overlay control event handlers:', e);
    }

    // Create a small checkbox control to toggle drawing the debug axes
    (function createAxisToggleControl() {
        const parent = controlsOverlayElement || document.getElementById('sketch-holder') || document.body;
        try {
            const ctrl = document.createElement('div');
            ctrl.id = 'axis-toggle-control';
            ctrl.style.cssText = 'position: absolute; top: 8px; left: 8px; padding: 6px 8px; background: rgba(0,0,0,0.45); color: #fff; font-family: sans-serif; font-size: 12px; border-radius: 4px; z-index: 1000;';
            // Hidden by default - show via UI toggle or console if needed
            ctrl.style.display = 'none';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'axis-toggle-checkbox';
            checkbox.style.verticalAlign = 'middle';

            const label = document.createElement('label');
            label.htmlFor = 'axis-toggle-checkbox';
            label.style.marginLeft = '6px';
            label.style.cursor = 'pointer';
            label.textContent = 'Show axes';

            checkbox.addEventListener('change', function () { showAxis = !!checkbox.checked; });

            ctrl.appendChild(checkbox);
            ctrl.appendChild(label);

            // Append to the parent; make sure parent allows positioned children
            parent.style.position = parent.style.position || 'relative';
            parent.appendChild(ctrl);
        } catch (e) {
            // If DOM ops fail (rare), ignore silently
            console.warn('Could not create axis toggle control:', e);
        }
    })();

    // Initialize quake colors
    quakeFromColor = color(0, 255, 0, 150); // Default fromColor (green)
    quakeToColor = color(255, 0, 0, 150); // Default toColor (red)
}

function windowResized() {
    const sketchHolder = document.getElementById('sketch-holder');
    const canvasWidth = sketchHolder.offsetWidth;
    const canvasHeight = canvasWidth * (9 / 16); // Maintain 16:9 aspect ratio
    resizeCanvas(canvasWidth, canvasHeight);
}

function keyPressed() {
    if (key === 's' || key === 'S') {
        saveCanvas('earth3d_snapshot', 'png');
    }
    // quick keyboard toggle for axes
    if (key === 'a' || key === 'A') {
        showAxis = !showAxis;
        const cb = document.getElementById('axis-toggle-checkbox');
        if (cb) cb.checked = showAxis;
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
    try {
        console.log('[populateInitialIssHistory] Received historical ISS data. Points in data array:', responseData && responseData.data ? responseData.data.length : 'null/undefined');

        if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
            // Log the first data point to inspect its structure
            console.log('[populateInitialIssHistory] First data point:', JSON.stringify(responseData.data[0]));

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
            console.log('[populateInitialIssHistory] No historical data received or data is empty.');
            originalLoadedIssHistory = [];
            internalIssPathHistory = [];
        }
    } catch (e) {
        console.error('[populateInitialIssHistory] Error processing historical data:', e);
        // Ensure these are reset on error to avoid using corrupted data.
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
  // Conditional axes drawing controlled by the UI checkbox / 'A' key
        if (showAxis) {
            push();
            // drawAxis expects a length in model units; use a visible scale relative to earthSize
            drawAxis(earthSize * 50);
            pop();
        }

    // Normal angleY auto-rotation
    if (typeof autoRotationSpeed === 'number' && !isNaN(autoRotationSpeed)) {
        angleY += autoRotationSpeed / 60.0; // Assumes ~60 FPS
    } else {
        // console.warn("[draw] autoRotationSpeed is not a valid number:", autoRotationSpeed);
    }

    ambientLight(250);
    scale(zoomLevel); // Apply zoom
  
    push(); // Main push for all rotating elements
    // Changed rotation order: X rotation first, then Y
    rotateX(angleX); // Use dynamic angleX (pitch, controlled by vertical drag)
    rotateY(angleY); // Use dynamic angleY (yaw, controlled by horizontal drag)

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
        // Always try to draw the ISS texture if available. If the image
        // hasn't loaded yet (width/height may be 0), fall back to a
        // reasonable plane size so the PNG is still visible.
        noStroke();
        if (issGif) {
            // fallback size when image dimensions are not ready
            const planeW = (issGif.width && issGif.width > 0) ? issGif.width / issSize : 40;
            const planeH = (issGif.height && issGif.height > 0) ? issGif.height / issSize : 40;
            texture(issGif);
            plane(planeW, planeH);
        } else {
            // If there's no image at all, show a small sphere as placeholder
            fill(255,0,0);
            sphere(5);
        }
        pop();
    }

    if (showIssHistoricalPath && internalIssPathHistory && internalIssPathHistory.length > 0) {
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

    // Draw predicted path (green) but stop when it intersects the pass-by cylinder
    let endPath3D = null; // will hold the 3D point where the predicted path hits the cylinder (if any)
    if (showIssPredictedPath && internalPredictedPath && internalPredictedPath.length > 1) {
        // Prepare cylinder geometry for intersection tests
        const detectionRadius3DUnits = (sketchPassByRadiusKM / earthActualRadiusKM) * earthSize;
        const cylinderHalfLength = CYLINDER_VISUAL_LENGTH / 2;
        const client3D = Tools.p5.getSphereCoord(earthSize, currentDisplayLat, currentDisplayLon);
        const cylCenter = client3D.copy();
        const cylAxis = cylCenter.copy().normalize(); // unit axis

        // Helper: test segment P0->P1 against finite cylinder (center C, axis u, radius r, half-length h)
        function segmentIntersectsCylinder(P0, P1, C, u, r, h) {
            const d = p5.Vector.sub(P1, P0);
            const m = p5.Vector.sub(P0, C);
            const dDotU = d.dot(u);
            const mDotU = m.dot(u);
            const d_perp = p5.Vector.sub(d, p5.Vector.mult(u, dDotU));
            const m_perp = p5.Vector.sub(m, p5.Vector.mult(u, mDotU));
            const a = d_perp.dot(d_perp);
            const b = 2 * d_perp.dot(m_perp);
            const c = m_perp.dot(m_perp) - r * r;

            const EPS = 1e-9;
            if (Math.abs(a) < EPS) {
                // Segment parallel to cylinder axis (no radial change). Either completely outside or inside radially.
                return null;
            }
            const disc = b * b - 4 * a * c;
            if (disc < 0) return null;
            const sqrtD = Math.sqrt(disc);
            const tCandidates = [(-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a)];
            for (let t of tCandidates) {
                if (t < 0 || t > 1) continue;
                const z = mDotU + t * dDotU; // axial coordinate relative to cylinder center
                if (z >= -h && z <= h) {
                    // Intersection point
                    const P = p5.Vector.add(P0, p5.Vector.mult(d, t));
                    return { t: t, point: P };
                }
            }
            return null;
        }

        push();
        stroke(0, 200, 0, 180);
        strokeWeight(1.5);
        noFill();
        beginShape();

        let stopped = false;
        for (let i = 0; i < internalPredictedPath.length - 1 && !stopped; i++) {
            const pA = internalPredictedPath[i];
            const pB = internalPredictedPath[i + 1];
            if (!pA || !pB) continue;
            if (typeof pA.lat !== 'number' || typeof pA.lon !== 'number') continue;
            if (typeof pB.lat !== 'number' || typeof pB.lon !== 'number') continue;

            const lonA = normalizeLon(pA.lon);
            const lonB = normalizeLon(pB.lon);
            const P0 = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, pA.lat, lonA);
            const P1 = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, pB.lat, lonB);

            // Add starting vertex for this segment (for continuous line)
            vertex(P0.x, P0.y, P0.z);

            // Test intersection of segment with cylinder (half-length is cylinderHalfLength)
            const hit = segmentIntersectsCylinder(P0, P1, cylCenter, cylAxis, detectionRadius3DUnits, cylinderHalfLength);
            if (hit) {
                // Add the intersection point as the final vertex and stop drawing further segments
                const Q = hit.point;
                vertex(Q.x, Q.y, Q.z);
                endPath3D = Q.copy();
                stopped = true;
            }
        }

        // If we didn't stop (no intersection), append the last predicted point as usual
        if (!stopped) {
            const last = internalPredictedPath[internalPredictedPath.length - 1];
            const lastLon = normalizeLon(last.lon);
            const vLast = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, last.lat, lastLon);
            vertex(vLast.x, vLast.y, vLast.z);
            endPath3D = vLast.copy();
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
            // Optional debug logging, enable by setting window.DEBUG_ISS_APPROACH = true elsewhere
            if (window.DEBUG_ISS_APPROACH) console.log('[ISSApproach] raw:', approachDetails);
            // Ensure approachDetails has lat, lon. alt might be optional or used if available.
            // The ISS path is drawn at earthSize + issDistanceToEarth.
            // The closest approach point should also be at this altitude relative to Earth's surface.
            // Use provided altitude (in km) if available to place marker at correct visual radius.
            let useRadius = earthSize + issDistanceToEarth;
            if (typeof approachDetails.alt === 'number' && !isNaN(approachDetails.alt)) {
                // approachDetails.alt expected in kilometers above Earth's surface
                useRadius = earthSize + (approachDetails.alt / earthActualRadiusKM) * earthSize;
            }
            const normLon = normalizeLon(approachDetails.lon);
            if (window.DEBUG_ISS_APPROACH) console.log('[ISSApproach] normLon, useRadius:', normLon, useRadius);
            let vApproach = Tools.p5.getSphereCoord(useRadius, approachDetails.lat, normLon);
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
        // If the predicted path intersection with the cylinder was computed earlier,
        // prefer that 3D point so the green marker sits exactly where the path stopped.
        if (typeof endPath3D !== 'undefined' && endPath3D && endPath3D.x !== undefined) {
            push();
            translate(endPath3D.x, endPath3D.y, endPath3D.z);
            noStroke();
            fill(MARKER_COLOR_GREEN[0], MARKER_COLOR_GREEN[1], MARKER_COLOR_GREEN[2]); // Use defined Green color
            sphere(END_OF_PATH_MARKER_SIZE); // Use defined size
            pop();
        } else {
            const lastPoint = internalPredictedPath[internalPredictedPath.length - 1];
            // Ensure lastPoint has lat, lon. Normalize lon before computing 3D position.
            const normLon = normalizeLon(lastPoint.lon);
            let vEndPath = Tools.p5.getSphereCoord(earthSize + issDistanceToEarth, lastPoint.lat, normLon);
            push();
            translate(vEndPath.x, vEndPath.y, vEndPath.z);
            noStroke();
            fill(MARKER_COLOR_GREEN[0], MARKER_COLOR_GREEN[1], MARKER_COLOR_GREEN[2]); // Use defined Green color
            sphere(END_OF_PATH_MARKER_SIZE); // Use defined size
            pop();
        }
    }

    // Draw Pass-by Detection Cylinder (Standard Alignment)
    if (sketchPassByRadiusKM > 0) {
        const detectionRadius3DUnits = (sketchPassByRadiusKM / earthActualRadiusKM) * earthSize;
       
        // Compute a unit vector from Earth center to client location (surface normal)
        let upVector = pClientLoc.copy().normalize();

        // p5.js cylinder's local axis is +Y. We need rotation that maps (0, -1, 0) to upVector
        // Use defaultCylinderAxis pointing up in model coordinates that matches how cylinder draws
        let defaultCylinderAxis = createVector(0, -1, 0);
        let rotationAxis = defaultCylinderAxis.cross(upVector);
        let rotationAngle = defaultCylinderAxis.angleBetween(upVector);

        // If vectors are nearly parallel/antiparallel, handle gracefully
        if (rotationAxis.magSq() < 1e-8) {
            // If opposite direction, rotate 180 degrees around X axis
            if (defaultCylinderAxis.dot(upVector) < 0) {
                rotationAxis = createVector(1, 0, 0);
                rotationAngle = Math.PI;
            } else {
                // Parallel and same direction: no rotation needed
                rotationAxis = createVector(1, 0, 0);
                rotationAngle = 0;
            }
        }

        push(); // Start a new context for the cylinder
        // Center the cylinder on the client location: translate to client point
        translate(pClientLoc.x, pClientLoc.y, pClientLoc.z);

        // Apply rotation to align cylinder's local Y axis with the surface normal (upVector)
        if (rotationAngle !== 0 && rotationAxis.magSq() > 0) {
            rotate(rotationAngle, rotationAxis);
        }

        // After rotation, draw the cylinder centered vertically on the client point
        // Cylinder is drawn centered at local origin; to have it extend equally above and below
        // the surface, we draw it with its center at origin and with the length CYLINDER_VISUAL_LENGTH
        fill(0, 100, 255, 30);
        noStroke();
        // Draw with center at origin so it extends half-length in both directions
        cylinder(detectionRadius3DUnits, CYLINDER_VISUAL_LENGTH);
        pop();
    }

    if (showQuakes) {
        show3DQuakes();
    }

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
        // Apply quakeMagFactor to the size calculation
        h = map(h, 0, maxh, 1, Math.min(mag * 5 * quakeMagFactor, 100 * quakeMagFactor));
        // Use global quakeFromColor and quakeToColor
        let quakeColor = lerpColor(quakeFromColor, quakeToColor, map(mag, 0, 8, 0, 1));
        push(); translate(pos.x, pos.y, pos.z); fill(quakeColor); noStroke(); sphere(Math.max(1, h / 10)); pop();
    }
}

window.earth3DSketch = {
    setMaxHistoryPoints: set3DMaxHistoryPoints,
    updatePredictedPath: update3DPredictedPath,
    getInternalIssPathHistory: () => internalIssPathHistory,
    getMaxHistoryPoints: () => MAX_HISTORY_POINTS,
    setSketchPassByRadiusKM: setSketchPassByRadiusKM,
    setShowIssHistoricalPath: function(value) {
        showIssHistoricalPath = !!value; // Ensure boolean
        if (typeof redraw === 'function') redraw();
    },
    setShowIssPredictedPath: function(value) {
        showIssPredictedPath = !!value; // Ensure boolean
        if (typeof redraw === 'function') redraw();
    },
    setShowQuakes: function(value) {
        showQuakes = !!value; // Ensure boolean
        if (typeof redraw === 'function') redraw();
    }
};

function mouseDragged() {
    try {
        // Convert p5 mouse coordinates (canvas local) to page coordinates and check the top element
        const canvasEl = document.querySelector('#sketch-holder canvas');
        if (canvasEl && controlsOverlayElement) {
            const rect = canvasEl.getBoundingClientRect();
            const pageX = rect.left + mouseX;
            const pageY = rect.top + mouseY;
            const topEl = document.elementFromPoint(pageX, pageY);
            if (topEl && (topEl.closest('#controls-overlay') || topEl.closest('#axis-toggle-control') || topEl.tagName === 'INPUT' || topEl.closest('input'))) {
                // Mouse is over the overlay or its controls — allow the browser to handle the interaction
                return true; // allow default p5/browser behavior
            }
        }
    } catch (e) {
        // If anything goes wrong here, fall back to original bounding-box check as a best-effort
        if (controlsOverlayElement &&
            mouseX >= controlsOverlayElement.offsetLeft && mouseX <= controlsOverlayElement.offsetLeft + controlsOverlayElement.offsetWidth &&
            mouseY >= controlsOverlayElement.offsetTop && mouseY <= controlsOverlayElement.offsetTop + controlsOverlayElement.offsetHeight) {
            return true;
        }
    }

    // If not over the overlay, and mouse is within canvas bounds (original check)
    if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
        let dx = mouseX - pmouseX;
        let dy = mouseY - pmouseY;
        angleY += dx * 0.01; // dx controls angleY (yaw) - direction remains as is
        angleX -= dy * 0.01; // dy controls angleX (pitch) - INVERTED direction
        angleX = constrain(angleX, -Math.PI/2.1, Math.PI/2.1); // Keep constraint on pitch
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

let initialPinchDistance = 0;

function touchStarted() {
    if (touches.length === 2) {
        initialPinchDistance = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
    }
    return false;
}

function touchMoved() {
    if (touches.length === 2) {
        const currentPinchDistance = dist(touches[0].x, touches[0].y, touches[1].x, touches[1].y);
        const zoomAmount = (currentPinchDistance - initialPinchDistance) * 0.01;
        zoomLevel += zoomAmount;
        zoomLevel = constrain(zoomLevel, 0.2, 5.0);
        initialPinchDistance = currentPinchDistance;
    } else if (touches.length === 1) {
        let dx = mouseX - pmouseX;
        let dy = mouseY - pmouseY;
        angleY += dx * 0.01;
        angleX -= dy * 0.01;
        angleX = constrain(angleX, -Math.PI / 2.1, Math.PI / 2.1);
    }
    return false;
}
