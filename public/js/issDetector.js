import { haversineDistance, getSphereCoord } from './utils.js';
import * as predictor from './issOrbitPredictor.js';
import IssCamera from './issCamera.js';

// This function will be the main sketch. It's exported and passed to the p5 constructor.
export default function(p) {
    // Sketch-specific variables
    let issCam;
    let internalIssPathHistory = [];
    let MAX_HISTORY_POINTS = 4200;
    let originalLoadedIssHistory = [];
    let internalPredictedPath = [];
    const pathPointSphereSize = 2;
    let autoRotationSpeed = (Math.PI * 2) / 120;
    let angleY = 0;
    let angleX = 0;
    let zoomLevel = 1.0;
    let controlsOverlayElement;
    let cloudyEarth;
    let earthquakes;
    let issGif;
    let quakeFromColor;
    let quakeToColor;
    let quakeMagFactor = 1.0;
    let showIssHistoricalPath = true;
    let showIssPredictedPath = true;
    let showQuakes = false;
    let showIssCamera = false;
    let issCameraView;
    let issFov = 60;
    let showApproachInfo = true; // UI toggle: show/hide great-circle path and approach time label
    let approachInfoDiv = null;
    const earthSize = 300;
    const earthActualRadiusKM = 6371;
    const issDistanceToEarth = 50;
    const gpsSize = 5;
    const issSize = 6;
    const CYLINDER_VISUAL_LENGTH = 150; // Keep a fixed visual length for the detection cylinder
    const MARKER_COLOR_TEAL = [255, 255, 0]; // changed to yellow to match request
    const MARKER_COLOR_GREEN = [0, 200, 0];
    const USER_LOCATION_MARKER_SIZE = gpsSize;
    const CLOSEST_APPROACH_MARKER_SIZE = USER_LOCATION_MARKER_SIZE / 2; // half size of user marker
    const END_OF_PATH_MARKER_SIZE = USER_LOCATION_MARKER_SIZE / 2;
    let sketchPassByRadiusKM = 1500;
    let showAxis = false;
    let initialPinchDistance = 0;

    // --- API for main script to interact with the sketch ---
    const sketchApi = {
        set3DMaxHistoryPoints: (newLimit) => {
            if (typeof newLimit !== 'number' || isNaN(newLimit) || newLimit < 0) return;
            MAX_HISTORY_POINTS = newLimit;
            if (originalLoadedIssHistory.length > 0) {
                const startIndex = Math.max(0, originalLoadedIssHistory.length - MAX_HISTORY_POINTS);
                internalIssPathHistory = originalLoadedIssHistory.slice(startIndex);
            }
        },
        update3DPredictedPath: (pointsFrom2D) => {
            if (Array.isArray(pointsFrom2D)) {
                internalPredictedPath = pointsFrom2D.map(pt => ({ lat: pt.lat, lon: pt.lng, time: pt.time }));
            } else {
                internalPredictedPath = [];
            }
        },
        setSketchPassByRadiusKM: (newRadiusKM) => {
            if (typeof newRadiusKM === 'number' && newRadiusKM >= 0) sketchPassByRadiusKM = newRadiusKM;
        },
        setShowIssHistoricalPath: (value) => { showIssHistoricalPath = !!value; },
        setShowIssPredictedPath: (value) => { showIssPredictedPath = !!value; },
        setShowQuakes: (value) => { showQuakes = !!value; },
        setShowIssCamera: (value) => { if (issCam) issCam.setShow(value); },
        setIssFov: (value) => { if (issCam) issCam.setFov(value); },
    };
    window.p5SketchApi = sketchApi;

    function normalizeLon(lon) {
        if (typeof lon !== 'number' || isNaN(lon)) return lon;
        return ((lon + 180) % 360 + 360) % 360 - 180;
    }

    function populateInitialIssHistory(responseData) {
        if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
            const pointsToProcess = responseData.data.sort((a, b) => new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime());
            originalLoadedIssHistory = pointsToProcess.map(pt => ({ lat: pt.latitude, lon: pt.longitude, timeStamp: pt.timeStamp }));
            sketchApi.set3DMaxHistoryPoints(MAX_HISTORY_POINTS);
        }
    }

    p.preload = async () => {
        cloudyEarth = p.loadImage('/img/Planets/cloudyEarth.jpg');
        earthquakes = p.loadStrings('/data/quakes.csv');
        issGif = p.loadImage('/img/iss.png');
        try {
            const response = await fetch('/api/iss');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            populateInitialIssHistory(data);
        } catch (err) {
            console.error('[fetch error] Failed to load historical ISS data:', err);
        }
    };

    p.setup = () => {
        const sketchHolder = document.getElementById('sketch-holder');
        const canvasWidth = sketchHolder.offsetWidth;
        const canvasHeight = canvasWidth * (9 / 16);
        const canvas = p.createCanvas(canvasWidth, canvasHeight, p.WEBGL);
        canvas.parent('sketch-holder');
        controlsOverlayElement = document.getElementById('controls-overlay');

        try {
            if (controlsOverlayElement) {
                controlsOverlayElement.style.pointerEvents = 'auto';
                controlsOverlayElement.style.zIndex = 2000;
            }
            if (canvas && canvas.elt) {
                canvas.elt.style.zIndex = 1000;
                canvas.elt.style.pointerEvents = 'auto';
            }
            const controlEls = controlsOverlayElement.querySelectorAll('input, button, label');
            controlEls.forEach(el => {
                el.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); }, false);
                el.addEventListener('pointermove', (ev) => { ev.stopPropagation(); }, false);
                el.addEventListener('mousedown', (ev) => { ev.stopPropagation(); }, false);
                el.addEventListener('touchstart', (ev) => { ev.stopPropagation(); }, false);
                el.addEventListener('touchmove', (ev) => { ev.stopPropagation(); }, false);
            });
            controlsOverlayElement.addEventListener('pointerdown', (ev) => { ev.stopPropagation(); }, false);
            controlsOverlayElement.addEventListener('mousedown', (ev) => { ev.stopPropagation(); }, false);
            controlsOverlayElement.addEventListener('click', (ev) => { ev.stopPropagation(); }, false);
        } catch (e) {
            console.warn('Could not set up overlay event handlers:', e);
        }

        // Add a small UI toggle to show/hide the great-circle approach path and approach time label
        try {
            if (controlsOverlayElement) {
                const toggleDiv = document.createElement('div');
                toggleDiv.style.marginTop = '6px';
                toggleDiv.style.display = 'flex';
                toggleDiv.style.alignItems = 'center';

                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.id = 'show-approach-info';
                chk.checked = showApproachInfo;
                chk.style.marginRight = '6px';

                const lbl = document.createElement('label');
                lbl.htmlFor = chk.id;
                lbl.textContent = 'Show approach path/time';
                lbl.style.color = '#fff';
                lbl.style.userSelect = 'none';

                // stop propagation on these controls so they don't interfere with globe dragging
                ['pointerdown', 'pointermove', 'mousedown', 'touchstart', 'touchmove'].forEach(evt => {
                    chk.addEventListener(evt, (ev) => ev.stopPropagation(), false);
                    lbl.addEventListener(evt, (ev) => ev.stopPropagation(), false);
                });

                chk.addEventListener('change', (ev) => {
                    showApproachInfo = !!ev.target.checked;
                    try {
                        if (approachInfoDiv) approachInfoDiv.style.display = showApproachInfo ? 'block' : 'none';
                    } catch (e) { /* ignore */ }
                });

                toggleDiv.appendChild(chk);
                toggleDiv.appendChild(lbl);
                controlsOverlayElement.appendChild(toggleDiv);
            }
        } catch (e) {
            console.warn('Could not add approach toggle control:', e);
        }

        // create a small DOM container to show approach time/details (avoids drawing text in WEBGL)
        try {
            if (controlsOverlayElement) {
                approachInfoDiv = document.createElement('div');
                approachInfoDiv.id = 'approach-info';
                approachInfoDiv.style.marginTop = '6px';
                approachInfoDiv.style.padding = '6px 8px';
                approachInfoDiv.style.background = 'rgba(0,0,0,0.6)';
                approachInfoDiv.style.color = '#fff';
                approachInfoDiv.style.fontSize = '12px';
                approachInfoDiv.style.borderRadius = '4px';
                approachInfoDiv.style.display = showApproachInfo ? 'block' : 'none';
                approachInfoDiv.textContent = '';
                controlsOverlayElement.appendChild(approachInfoDiv);
            }
        } catch (e) {
            console.warn('Could not create approach info element:', e);
        }

        quakeFromColor = p.color(0, 255, 0, 150);
        quakeToColor = p.color(255, 0, 0, 150);

        issCam = new IssCamera(p, cloudyEarth, earthSize, issDistanceToEarth);
    };

    p.windowResized = () => {
        const sketchHolder = document.getElementById('sketch-holder');
        const canvasWidth = sketchHolder.offsetWidth;
        const canvasHeight = canvasWidth * (9 / 16);
        p.resizeCanvas(canvasWidth, canvasHeight);
        if (issCam) {
            issCam.resize();
        }
    };

    p.keyPressed = () => {
        if (p.key === 's' || p.key === 'S') p.saveCanvas('earth3d_snapshot', 'png');
        if (p.key === 'a' || p.key === 'A') showAxis = !showAxis;
    };

    function drawAxis(len, width = 2) {
        p.strokeWeight(width);
        p.stroke(255, 0, 0); p.line(0, 0, 0, len, 0, 0);
        p.stroke(0, 255, 0); p.line(0, 0, 0, 0, len, 0);
        p.stroke(0, 0, 255); p.line(0, 0, 0, 0, 0, len);
    }

    function show3DQuakes() {
        if (!earthquakes || earthquakes.length === 0) return;
        for (let i = 1; i < earthquakes.length; i++) {
            const data = earthquakes[i].split(/,/);
            if (data.length < 5) continue;
            const lat = parseFloat(data[1]);
            const lon = parseFloat(data[2]);
            const mag = parseFloat(data[4]);
            if (isNaN(lat) || isNaN(lon) || isNaN(mag)) continue;
            const pos = getSphereCoord(p, earthSize, lat, lon);
            let h = p.pow(10, mag);
            const maxh = p.pow(10, 8);
            h = p.map(h, 0, maxh, 1, Math.min(mag * 5 * quakeMagFactor, 100 * quakeMagFactor));
            const quakeColor = p.lerpColor(quakeFromColor, quakeToColor, p.map(mag, 0, 8, 0, 1));
            p.push();
            p.translate(pos.x, pos.y, pos.z);
            p.fill(quakeColor);
            p.noStroke();
            p.sphere(Math.max(1, h / 10));
            p.pop();
        }
    }

    p.draw = () => {
        const currentDisplayLat = (typeof window.clientLat === 'number') ? window.clientLat : 46.8139;
        const currentDisplayLon = (typeof window.clientLon === 'number') ? window.clientLon : -71.2080;

        p.background(52);
        if (showAxis) { p.push(); drawAxis(earthSize * 50); p.pop(); }

        angleY += autoRotationSpeed / 60.0;

        p.ambientLight(250);
        p.scale(zoomLevel);
        p.push();
        p.rotateX(angleX);
        p.rotateY(angleY);

        p.push();
        p.texture(cloudyEarth);
        p.noStroke();
        p.sphere(earthSize);
        p.pop();

        if (window.iss && typeof window.iss.latitude === 'number' && typeof window.iss.longitude === 'number') {
            let addPoint = true;
            if (internalIssPathHistory.length > 0) {
                const lastPoint = internalIssPathHistory[internalIssPathHistory.length - 1];
                if (lastPoint.lat === window.iss.latitude && lastPoint.lon === window.iss.longitude) addPoint = false;
            }
            if (addPoint) {
                internalIssPathHistory.push({ lat: window.iss.latitude, lon: window.iss.longitude, timeStamp: window.iss.timestamp || new Date().getTime() });
            }
            while (internalIssPathHistory.length > MAX_HISTORY_POINTS) internalIssPathHistory.shift();

            const vISS = getSphereCoord(p, earthSize + issDistanceToEarth, window.iss.latitude, window.iss.longitude);
            p.push();
            p.translate(vISS.x, vISS.y, vISS.z);
            p.noStroke();
            if (issGif) {
                const planeW = (issGif.width > 0) ? issGif.width / issSize : 40;
                const planeH = (issGif.height > 0) ? issGif.height / issSize : 40;
                p.texture(issGif);
                p.plane(planeW, planeH);
            } else {
                p.fill(255, 0, 0);
                p.sphere(5);
            }
            p.pop();
        }

        if (showIssHistoricalPath && internalIssPathHistory.length > 0) {
            p.push();
            p.noStroke();
            p.fill(255, 165, 0, 150);
            for (const histPoint of internalIssPathHistory) {
                if (histPoint && typeof histPoint.lat === 'number' && typeof histPoint.lon === 'number') {
                    const vPath = getSphereCoord(p, earthSize + issDistanceToEarth, histPoint.lat, histPoint.lon);
                    p.push(); p.translate(vPath.x, vPath.y, vPath.z); p.sphere(pathPointSphereSize); p.pop();
                }
            }
            p.pop();
        }

        if (showIssPredictedPath && internalPredictedPath.length > 1) {
            const detectionRadiusKM = sketchPassByRadiusKM;
            let insideCylinder = false;
            let entryPoint = null;
            let exitPoint = null;
            const regularPath = [];
            const highlightedPath = [];

            for (let i = 0; i < internalPredictedPath.length - 1; i++) {
                const p1 = internalPredictedPath[i];
                const p2 = internalPredictedPath[i + 1];
                const dist2 = haversineDistance(p2.lat, p2.lon, currentDisplayLat, currentDisplayLon);
                const p2_inside = dist2 <= detectionRadiusKM;

                if (!insideCylinder && p2_inside) {
                    entryPoint = p2;
                    insideCylinder = true;
                    regularPath.push(p1);
                    highlightedPath.push(p1, p2);
                } else if (insideCylinder && !p2_inside) {
                    exitPoint = p2;
                    insideCylinder = false;
                    highlightedPath.push(p1, p2);
                    break;
                } else if (insideCylinder) {
                    highlightedPath.push(p1, p2);
                } else {
                    regularPath.push(p1, p2);
                }
            }

            const entryTimeSpan = document.getElementById('pass-entry-time');
            const exitTimeSpan = document.getElementById('pass-exit-time');
            if (entryPoint && entryTimeSpan) {
                entryTimeSpan.textContent = new Date(Date.now() + entryPoint.time * 1000).toLocaleTimeString();
            } else if (entryTimeSpan) {
                entryTimeSpan.textContent = 'N/A';
            }
            if (exitPoint && exitTimeSpan) {
                exitTimeSpan.textContent = new Date(Date.now() + exitPoint.time * 1000).toLocaleTimeString();
            } else if (exitTimeSpan) {
                exitTimeSpan.textContent = 'N/A';
            }

            if (regularPath.length > 0) {
                p.push();
                p.stroke(0, 200, 0, 180);
                p.strokeWeight(1.5);
                p.noFill();
                p.beginShape();
                for (const pt of regularPath) {
                    const v = getSphereCoord(p, earthSize + issDistanceToEarth, pt.lat, normalizeLon(pt.lon));
                    p.vertex(v.x, v.y, v.z);
                }
                p.endShape();
                p.pop();
            }
            if (highlightedPath.length > 0) {
                p.push();
                p.stroke(255, 255, 0, 220);
                p.strokeWeight(3);
                p.noFill();
                p.beginShape();
                for (const pt of highlightedPath) {
                    const v = getSphereCoord(p, earthSize + issDistanceToEarth, pt.lat, normalizeLon(pt.lon));
                    p.vertex(v.x, v.y, v.z);
                }
                p.endShape();
                p.pop();
            }
        }

        const pClientLoc = getSphereCoord(p, earthSize, currentDisplayLat, currentDisplayLon);
        p.push();
        p.translate(pClientLoc.x, pClientLoc.y, pClientLoc.z);
        p.noStroke();
        p.fill(255, 255, 0);
        p.sphere(gpsSize);
        p.pop();

        // Prefer the API that returns an absolute Date for the approach time
        const approachDetails = predictor.getClosestApproachDetailsAsDate ? predictor.getClosestApproachDetailsAsDate() : predictor.getClosestApproachDetails();
        // make vApproach available to the following blocks (label drawing, etc.)
        let vApproach = null;
        if (approachDetails) {
            let useRadius = earthSize + issDistanceToEarth;
            if (typeof approachDetails.alt === 'number' && !isNaN(approachDetails.alt)) {
                useRadius = earthSize + (approachDetails.alt / earthActualRadiusKM) * earthSize;
            }
            const normLon = normalizeLon(approachDetails.lon);
            vApproach = getSphereCoord(p, useRadius, approachDetails.lat, normLon);
            p.push();
            p.translate(vApproach.x, vApproach.y, vApproach.z);
            p.noStroke();
            p.fill(MARKER_COLOR_TEAL[0], MARKER_COLOR_TEAL[1], MARKER_COLOR_TEAL[2]);
            p.sphere(CLOSEST_APPROACH_MARKER_SIZE);
            p.pop();
        }

    // If we have an approach and a user location, draw a great-circle path between them (conditionally)
    if (showApproachInfo && approachDetails && typeof currentDisplayLat === 'number' && typeof currentDisplayLon === 'number') {
            // Helper: compute n interpolated points along the great-circle between two lat/lon points
            function interpolateGreatCircle(lat1, lon1, lat2, lon2, n) {
                // convert to radians
                const toRad = (d) => d * Math.PI / 180;
                const toDeg = (r) => r * 180 / Math.PI;
                const φ1 = toRad(lat1);
                const λ1 = toRad(lon1);
                const φ2 = toRad(lat2);
                const λ2 = toRad(lon2);
                const sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1);
                const sinφ2 = Math.sin(φ2), cosφ2 = Math.cos(φ2);
                const Δλ = λ2 - λ1;
                const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + cosφ1 * cosφ2 * Math.sin(Δλ / 2) ** 2));
                const points = [];
                if (d === 0 || isNaN(d)) {
                    for (let i = 0; i <= n; i++) points.push({ lat: lat1, lon: lon1 });
                    return points;
                }
                for (let i = 0; i <= n; i++) {
                    const f = i / n;
                    const A = Math.sin((1 - f) * d) / Math.sin(d);
                    const B = Math.sin(f * d) / Math.sin(d);
                    const x = A * cosφ1 * Math.cos(λ1) + B * cosφ2 * Math.cos(λ2);
                    const y = A * cosφ1 * Math.sin(λ1) + B * cosφ2 * Math.sin(λ2);
                    const z = A * sinφ1 + B * sinφ2;
                    const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
                    const λi = Math.atan2(y, x);
                    points.push({ lat: toDeg(φi), lon: toDeg(λi) });
                }
                return points;
            }

            const gcPoints = interpolateGreatCircle(currentDisplayLat, currentDisplayLon, approachDetails.lat, approachDetails.lon, 64);
            p.push();
            p.noFill();
            p.stroke(255, 255, 0, 200);
            p.strokeWeight(2);
            p.beginShape();
            for (const pt of gcPoints) {
                const v = getSphereCoord(p, earthSize + issDistanceToEarth, pt.lat, normalizeLon(pt.lon));
                p.vertex(v.x, v.y, v.z);
            }
            p.endShape();
            p.pop();

            // Update DOM approach info panel (avoids WEBGL text/font requirements)
            try {
                if (approachInfoDiv) {
                    if (showApproachInfo && approachDetails.date instanceof Date) {
                        const labelText = approachDetails.date.toLocaleString();
                        const distText = (typeof approachDetails.dist === 'number') ? `${approachDetails.dist.toFixed(1)} km` : '';
                        approachInfoDiv.style.display = 'block';
                        approachInfoDiv.textContent = `Approach: ${labelText}` + (distText ? ` — ${distText}` : '');
                    } else {
                        approachInfoDiv.style.display = 'none';
                        approachInfoDiv.textContent = '';
                    }
                }
            } catch (e) {
                // DOM ops may fail if controls overlay is unavailable; ignore silently
            }
        }

        if (sketchPassByRadiusKM > 0) {
            const detectionRadius3DUnits = (sketchPassByRadiusKM / earthActualRadiusKM) * earthSize;
            const upVector = pClientLoc.copy().normalize();
            const defaultCylinderAxis = p.createVector(0, -1, 0);
            const rotationAxis = defaultCylinderAxis.cross(upVector);
            let rotationAngle = defaultCylinderAxis.angleBetween(upVector);

            p.push();
            p.translate(pClientLoc.x, pClientLoc.y, pClientLoc.z);
            if (rotationAngle !== 0 && rotationAxis.magSq() > 0) {
                p.rotate(rotationAngle, rotationAxis);
            }
            p.fill(0, 100, 255, 30);
            p.noStroke();
            p.cylinder(detectionRadius3DUnits, CYLINDER_VISUAL_LENGTH);
            p.pop();
        }

        if (showQuakes) show3DQuakes();
        p.pop();

        if (issCam) {
            issCam.update(window.iss);
            issCam.display();
        }
    };

    p.mouseDragged = () => {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            angleY += (p.mouseX - p.pmouseX) * 0.01;
            angleX -= (p.mouseY - p.pmouseY) * 0.01;
            angleX = p.constrain(angleX, -Math.PI / 2.1, Math.PI / 2.1);
            return false;
        }
    };

    p.mouseWheel = (event) => {
        if (p.mouseX > 0 && p.mouseX < p.width && p.mouseY > 0 && p.mouseY < p.height) {
            zoomLevel -= event.deltaY * 0.001 * zoomLevel;
            zoomLevel = p.constrain(zoomLevel, 0.2, 5.0);
            return false;
        }
    };

    p.touchStarted = () => {
        if (p.touches.length === 2) {
            initialPinchDistance = p.dist(p.touches[0].x, p.touches[0].y, p.touches[1].x, p.touches[1].y);
        }
        return false;
    };

    p.touchMoved = () => {
        if (p.touches.length === 2) {
            const currentPinchDistance = p.dist(p.touches[0].x, p.touches[0].y, p.touches[1].x, p.touches[1].y);
            const zoomAmount = (currentPinchDistance - initialPinchDistance) * 0.01;
            zoomLevel += zoomAmount;
            zoomLevel = p.constrain(zoomLevel, 0.2, 5.0);
            initialPinchDistance = currentPinchDistance;
        } else if (p.touches.length === 1) {
            angleY += (p.mouseX - p.pmouseX) * 0.01;
            angleX -= (p.mouseY - p.pmouseY) * 0.01;
            angleX = p.constrain(angleX, -Math.PI / 2.1, Math.PI / 2.1);
        }
        return false;
    };
}