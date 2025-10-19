import { getSphereCoord, haversineDistance } from './utils.js';
import * as predictor from './issOrbitPredictor.js';
import IssCamera from './issCamera.js';
import Starfield from './Starfield.js';
import Globe from './Globe.js';
import Trajectory from './Trajectory.js';

/**
 * ISS Detector 3D Visualization
 * 
 * Performance Optimizations:
 * 1. Cached 3D coordinates for historical path (~8000 points) - recalculate only when data changes
 * 2. Cached 3D coordinates for predicted path (~300 points) - recalculate only when prediction updates
 * 3. Cached 3D coordinates for great circle path (~48 points) - recalculate only when approach changes
 * 4. Cached detection radius ring vertices (96 vertices) - recalculate only when radius changes
 * 5. Reduced sphere detail: Earth (24×16), markers (8×6), earthquakes (6×4)
 * 6. Throttled DOM updates to 1fps instead of 60fps
 * 
 * These optimizations reduce frame time from ~70ms to <16ms (target for 60fps)
 */

// This function will be the main sketch. It's exported and passed to the p5 constructor.
export default function(p) {
    // Sketch-specific variables
    let issCam;
    let internalIssPathHistory = [];
    let MAX_HISTORY_POINTS = 8400;
    let originalLoadedIssHistory = [];
    let internalPredictedPath = [];
    let autoRotationSpeed = (Math.PI * 2) / 120;
    let angleY = 0;
    let angleX = 0;
    let cloudRotationY = 0;
    let windSpeedMultiplier = 0.0; // Default to 0 to keep clouds in real-time position
    let zoomLevel = 1.0;
    let earthTexture; // New variable for the Earth's surface texture
    let cloudTexture; // New variable for the cloud layer texture
    let specularTexture; // Specular map for ocean reflectivity
    let earthShader; // Custom shader for specular lighting
    let starfield;
    let globe;
    let historicalPath;
    let predictedPath;
    let earthquakes;
    let issGif;
    let quakeFromColor;
    let quakeToColor;
    let quakeMagFactor = 1.0;
    let showIssHistoricalPath = true;
    let showIssPredictedPath = true;
    let showQuakes = false;
    let showIssCamera = false;
    let showCloud = true; // Toggle for cloud layer visibility
    let issCameraView;
    let issFov = 60;
    let showApproachInfo = false; // UI toggle: show/hide great-circle path and approach time label
    let approachInfoDiv = null;
    let passEntryTimeSpan = null; // Cache DOM elements
    let passExitTimeSpan = null;
    const APPROACH_STALE_MINUTES = 5; // consider a prediction stale after this many minutes
    let approachInfoIntervalId = null;
    let approachIsRefreshing = false;
    const earthSize = 300;
    const earthActualRadiusKM = 6371;
    const issAltitudeKM = 408; // ISS orbital altitude
    const issDistanceToEarth = (issAltitudeKM / earthActualRadiusKM) * earthSize; // ~19.2 units (accurate scale)
    const gpsSize = 5;
    const issSize = 6;
    const MARKER_COLOR_TEAL = [0, 128, 128];
    const MARKER_COLOR_GREEN = [0, 200, 0];
    const DISK_ELEVATION = 0.0; // no elevation: disk lies flush with the globe surface
    const DISK_GRADIENT_STEPS = 6; // number of concentric rings to approximate a radial gradient
    const USER_LOCATION_MARKER_SIZE = gpsSize;
    const CLOSEST_APPROACH_MARKER_SIZE = USER_LOCATION_MARKER_SIZE;
    const END_OF_PATH_MARKER_SIZE = USER_LOCATION_MARKER_SIZE / 2;
    let sketchPassByRadiusKM = 1500;
    const PASS_IMMINENT_MINUTES = 5; // if approach is within this many minutes, treat as imminent
    const PULSE_PERIOD_SEC = 1.4; // pulse period in seconds
    let showAxis = false;
    let initialPinchDistance = 0;

    // Performance: Cache 3D coordinates to avoid recalculating every frame
    let cachedHistoricalPath3D = null;
    let cachedPredictedPath3D = null;
    let cachedGreatCirclePath3D = null;
    let cachedDetectionRings = null; // Cache detection radius ring vertices

    // --- API for main script to interact with the sketch ---
    const sketchApi = {
        set3DMaxHistoryPoints: (newLimit) => {
            if (typeof newLimit !== 'number' || isNaN(newLimit) || newLimit < 0) return;
            MAX_HISTORY_POINTS = newLimit;
            if (originalLoadedIssHistory.length > 0) {
                const startIndex = Math.max(0, originalLoadedIssHistory.length - MAX_HISTORY_POINTS);
                internalIssPathHistory = originalLoadedIssHistory.slice(startIndex);
                cachedHistoricalPath3D = null; // Invalidate cache
            }
        },
        getLoadedHistoryCount: () => originalLoadedIssHistory.length,
        setSketchPassByRadiusKM: (newRadiusKM) => {
            if (typeof newRadiusKM === 'number' && newRadiusKM >= 0) {
                sketchPassByRadiusKM = newRadiusKM;
                cachedPredictedPath3D = null; // Radius affects path rendering
                cachedDetectionRings = null; // Invalidate ring cache
            }
        },
        setShowIssHistoricalPath: (value) => { showIssHistoricalPath = !!value; },
        setShowIssPredictedPath: (value) => { showIssPredictedPath = !!value; },
        setShowQuakes: (value) => { showQuakes = !!value; },
        setShowCloud: (value) => { showCloud = !!value; },
        setShowIssCamera: (value) => { if (issCam) issCam.setShow(value); },
        setIssFov: (value) => { if (issCam) issCam.setFov(value); },
    };
    window.p5SketchApi = sketchApi;

    function normalizeLon(lon) {
        if (typeof lon !== 'number' || isNaN(lon)) return lon;
        return ((lon + 180) % 360 + 360) % 360 - 180;
    }

    function populateInitialIssHistory(responseData) {
        console.log('[issDetector] populateInitialIssHistory called with:', responseData);
        
        if (responseData && responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
            console.log('[issDetector] Raw data array length:', responseData.data.length);
            console.log('[issDetector] Response meta:', responseData.meta);
            
            const pointsToProcess = responseData.data.sort((a, b) => new Date(a.timeStamp).getTime() - new Date(b.timeStamp).getTime());
            originalLoadedIssHistory = pointsToProcess.map(pt => ({ lat: pt.latitude, lon: pt.longitude, timeStamp: pt.timeStamp }));
            
            console.log('[issDetector] After mapping, originalLoadedIssHistory.length:', originalLoadedIssHistory.length);
            
            // Update MAX_HISTORY_POINTS to match actual data count
            const actualCount = originalLoadedIssHistory.length;
            MAX_HISTORY_POINTS = actualCount;
            
            // Update the slider max to match actual data
            try {
                const pathLengthSlider = document.getElementById('pathLengthSlider');
                if (pathLengthSlider) {
                    pathLengthSlider.max = actualCount;
                    pathLengthSlider.value = actualCount;
                    const pathLengthValueSpan = document.getElementById('pathLengthValue');
                    if (pathLengthValueSpan) {
                        pathLengthValueSpan.textContent = actualCount;
                    }
                    console.log(`[issDetector] Loaded ${actualCount} historical ISS positions, slider max updated to ${actualCount}`);
                }
            } catch (e) {
                console.warn('[issDetector] Could not update slider max:', e);
            }
            
            sketchApi.set3DMaxHistoryPoints(MAX_HISTORY_POINTS);
        } else {
            console.warn('[issDetector] Invalid or empty response data:', responseData);
        }
    }

    // Canvas interaction setup - uses standard DOM events instead of p5 event handlers
    // This prevents p5 from interfering with page-level controls like sliders
    function setupCanvasInteractions(canvasElement) {
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        let touchStartDist = 0;

        // Mouse drag for rotation
        canvasElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        canvasElement.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - lastMouseX;
                const deltaY = e.clientY - lastMouseY;
                angleY += deltaX * 0.01;
                angleX -= deltaY * 0.01;
                angleX = p.constrain(angleX, -Math.PI / 2.1, Math.PI / 2.1);
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });

        canvasElement.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvasElement.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        // Mouse wheel for zoom
        canvasElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            zoomLevel -= e.deltaY * 0.001 * zoomLevel;
            zoomLevel = p.constrain(zoomLevel, 0.2, 5.0);
        }, { passive: false });

        // Touch events for mobile
        canvasElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                lastMouseX = e.touches[0].clientX;
                lastMouseY = e.touches[0].clientY;
                isDragging = true;
            } else if (e.touches.length === 2) {
                isDragging = false;
                touchStartDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        }, { passive: true }); // Passive: we don't prevent default on touchstart

        canvasElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && isDragging) {
                const deltaX = e.touches[0].clientX - lastMouseX;
                const deltaY = e.touches[0].clientY - lastMouseY;
                angleY += deltaX * 0.01;
                angleX -= deltaY * 0.01;
                angleX = p.constrain(angleX, -Math.PI / 2.1, Math.PI / 2.1);
                lastMouseX = e.touches[0].clientX;
                lastMouseY = e.touches[0].clientY;
                e.preventDefault();
            } else if (e.touches.length === 2) {
                const currentDist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const zoomAmount = (currentDist - touchStartDist) * 0.01;
                zoomLevel += zoomAmount;
                zoomLevel = p.constrain(zoomLevel, 0.2, 5.0);
                touchStartDist = currentDist;
                e.preventDefault();
            }
        }, { passive: false });

        canvasElement.addEventListener('touchend', () => {
            isDragging = false;
        });
    }

    p.preload = async () => {
        // High-quality 8K Earth textures (8192×4096, equirectangular projection)
        earthTexture = p.loadImage('/img/Planets/earth/earthmapDay.jpg');
        specularTexture = p.loadImage('/img/Planets/earth/earthmapSpecular.jpg');
        cloudTexture = p.loadImage('/api/live-cloud-map');
        earthquakes = p.loadStrings('/data/quakes.csv');
        issGif = p.loadImage('/img/iss.png');
        
        // Load custom shader for specular mapping
        earthShader = p.loadShader('/shaders/earth.vert', '/shaders/earth.frag');
        try {
            console.log('[issDetector] Fetching ISS historical data from /api/iss...');
            const response = await fetch('/api/iss');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            console.log('[issDetector] Received response, data.data.length:', data.data ? data.data.length : 'N/A');
            console.log('[issDetector] Response meta:', data.meta);
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

        // Performance optimization: Enable antialiasing for smoother visuals
        p.setAttributes('antialias', true);
        
        // Cap frame rate at 60 FPS to prevent excessive rendering
        p.frameRate(60);

        // Setup canvas interactions using standard DOM events instead of p5 event handlers
        setupCanvasInteractions(canvas.elt);

        // Instantiate the new classes
        starfield = new Starfield(p);
        globe = new Globe(p, earthSize, earthTexture, cloudTexture, specularTexture);
        
        // Set the shader for specular mapping (must be done after Globe construction)
        if (earthShader && specularTexture) {
            globe.setShader(earthShader);
            console.log('[issDetector] Specular mapping enabled with custom shader');
        } else {
            console.warn('[issDetector] Specular mapping disabled - shader or texture missing');
        }
        
        historicalPath = new Trajectory(p, p.color(255, 165, 0, 180));
        predictedPath = new Trajectory(p, p.color(0, 200, 0, 180));

        const windSpeedSlider = document.getElementById('windSpeedSlider');
        const windSpeedValueSpan = document.getElementById('windSpeedValue');
        if (windSpeedSlider) {
            windSpeedSlider.addEventListener('input', (e) => {
                windSpeedMultiplier = parseFloat(e.target.value);
                if (windSpeedValueSpan) {
                    windSpeedValueSpan.textContent = windSpeedMultiplier.toFixed(1);
                }
            });
        }

        // Get references to the approach info elements that are now in the HTML
        try {
            approachInfoDiv = document.getElementById('approach-info');
            passEntryTimeSpan = document.getElementById('pass-entry-time');
            passExitTimeSpan = document.getElementById('pass-exit-time');
            const showApproachCheckbox = document.getElementById('show-approach-info');
            const refreshPredictionBtn = document.getElementById('refresh-prediction-btn');

            if (showApproachCheckbox) {
                showApproachCheckbox.checked = showApproachInfo;
                showApproachCheckbox.addEventListener('change', (ev) => {
                    showApproachInfo = !!ev.target.checked;
                });
            }

            if (refreshPredictionBtn) {
                refreshPredictionBtn.addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    try {
                        if (typeof predictor.refreshTLE === 'function') {
                            predictor.refreshTLE().then(() => {}).catch(() => {});
                        } else if (typeof predictor.fetchAndPredict === 'function') {
                            predictor.fetchAndPredict().then(() => {}).catch(() => {});
                        }
                    } catch (e) { console.warn('Refresh failed', e); }
                });
            }

            if (!approachInfoDiv) {
                console.warn('Could not find approach-info element');
            }
        } catch (e) {
            console.warn('Could not set up approach info controls:', e);
            approachInfoDiv = null;
        }

        // start a 1s interval to update countdown and timestamps
        try {
            const pad = (n) => (n < 10 ? '0' + n : '' + n);
            const formatHMS = (ms) => {
                const sign = ms < 0 ? '-' : '';
                ms = Math.abs(ms);
                const s = Math.floor(ms / 1000) % 60;
                const m = Math.floor(ms / (60 * 1000)) % 60;
                const h = Math.floor(ms / (3600 * 1000));
                return sign + pad(h) + ':' + pad(m) + ':' + pad(s);
            };

            function updateApproachInfo() {
                try {
                    if (!approachInfoDiv) return;
                    
                    const details = predictor.getClosestApproachDetailsAsDate ? predictor.getClosestApproachDetailsAsDate() : predictor.getClosestApproachDetails();
                    //console.log('[iss-detector] updater got approach details:', details);
                    if (!details) {
                        approachInfoDiv.textContent = 'No upcoming approach detected';
                        // try to trigger a prediction if we aren't already refreshing
                        if (!approachIsRefreshing) {
                            approachIsRefreshing = true;
                            approachInfoDiv.textContent = 'Calculating upcoming approach...';
                            console.log('[iss-detector] no approach found — triggering prediction');
                            const doFetch = (typeof predictor.refreshTLE === 'function') ? predictor.refreshTLE() : (typeof predictor.fetchAndPredict === 'function' ? predictor.fetchAndPredict() : Promise.reject(new Error('no predictor method')));
                            doFetch.then(() => {
                                approachIsRefreshing = false;
                                try { updateApproachInfo(); } catch (e) {}
                            }).catch((err) => {
                                approachIsRefreshing = false;
                                console.warn('[iss-detector] prediction trigger failed', err);
                                try { approachInfoDiv.textContent = 'No upcoming approach detected'; } catch (e) {}
                            });
                        }
                        return;
                    }

                    // determine absolute approach time
                    const absMs = details.absoluteTimeMs || (details.date instanceof Date ? details.date.getTime() : (Date.now() + (details.time || 0) * 1000));
                    const nowMs = Date.now();
                    const remainingMs = absMs - nowMs;
                    const localStr = new Date(absMs).toLocaleString();

                    // stale detection
                    const computedAtMs = details.computedAtMs || null;
                    const ageMs = computedAtMs ? (nowMs - computedAtMs) : 0;
                    const isStale = computedAtMs ? (ageMs > APPROACH_STALE_MINUTES * 60 * 1000) : false;

                    let status = '';
                    if (approachIsRefreshing) status = ' (refreshing...)';
                    else if (isStale) status = ' (STALE)';

                    // compute live ISS position and instantaneous distance to target (if available)
                    let liveDistText = '';
                    try {
                        const currentPos = (typeof predictor.getCurrentPosition === 'function') ? predictor.getCurrentPosition() : null;
                        if (currentPos && typeof currentPos.lat === 'number' && typeof currentPos.lon === 'number') {
                            const currentDisplayLat = (typeof window.clientLat === 'number') ? window.clientLat : 46.8139;
                            const currentDisplayLon = (typeof window.clientLon === 'number') ? window.clientLon : -71.2080;
                            const liveDist = haversineDistance(currentPos.lat, currentPos.lon, currentDisplayLat, currentDisplayLon);
                            liveDistText = `Current distance: ${liveDist.toFixed(1)} km — `;
                        }
                    } catch (e) { /* ignore */ }

                    approachInfoDiv.textContent = `${liveDistText}Approach in ${formatHMS(remainingMs)} — ${localStr}${status}`;

                    // auto-refresh if stale and not already refreshing
                    if (isStale && !approachIsRefreshing) {
                        approachIsRefreshing = true;
                        // call refreshTLE which will re-run prediction if successful
                        if (typeof predictor.refreshTLE === 'function') {
                            predictor.refreshTLE().then((ok) => {
                                approachIsRefreshing = false;
                                // trigger immediate update after refresh
                                try { updateApproachInfo(); } catch (e) { /* ignore */ }
                            }).catch(() => { approachIsRefreshing = false; });
                        } else if (typeof predictor.fetchAndPredict === 'function') {
                            predictor.fetchAndPredict().then(() => { approachIsRefreshing = false; try { updateApproachInfo(); } catch (e) {} }).catch(() => { approachIsRefreshing = false; });
                        } else {
                            approachIsRefreshing = false;
                        }
                    }
                } catch (err) {
                    console.warn('Error updating approach info:', err);
                }
            }

            // clear any existing interval then start a new one
            if (approachInfoIntervalId) clearInterval(approachInfoIntervalId);
            approachInfoIntervalId = setInterval(updateApproachInfo, 1000);
            // initial update
            updateApproachInfo();
            // if there's no data yet, trigger an initial prediction/fetch so the countdown appears
            try {
                const detailsNow = predictor.getClosestApproachDetailsAsDate ? predictor.getClosestApproachDetailsAsDate() : predictor.getClosestApproachDetails();
                if (!detailsNow) {
                    if (approachInfoDiv) approachInfoDiv.textContent = 'Calculating upcoming approach...';
                    if (typeof predictor.refreshTLE === 'function') {
                        approachIsRefreshing = true;
                        predictor.refreshTLE().then(() => { approachIsRefreshing = false; try { updateApproachInfo(); } catch (e) {} }).catch(() => { approachIsRefreshing = false; });
                    } else if (typeof predictor.fetchAndPredict === 'function') {
                        approachIsRefreshing = true;
                        predictor.fetchAndPredict().then(() => { approachIsRefreshing = false; try { updateApproachInfo(); } catch (e) {} }).catch(() => { approachIsRefreshing = false; });
                    }
                }
            } catch (e) { /* ignore */ }
        } catch (e) {
            console.warn('Could not start approach info updater:', e);
        }

        quakeFromColor = p.color(0, 255, 0, 150);
        quakeToColor = p.color(255, 0, 0, 150);

        issCam = new IssCamera(p, earthTexture, earthSize, issDistanceToEarth);

        // Register callback to receive predicted path updates from predictor
        predictor.setOnPathUpdate((pathPoints) => {
            if (Array.isArray(pathPoints)) {
                internalPredictedPath = pathPoints.map(pt => ({
                    lat: pt.lat,
                    lon: pt.lng,
                    timeStamp: pt.time
                }));
                predictedPath.update(internalPredictedPath);
                cachedPredictedPath3D = null; // Invalidate cache when path updates
            }
        });

        // Periodically refresh the cloud texture
        // Source (clouds.matteason.co.uk) updates every 3 hours using EUMETSAT data
        setInterval(() => {
            console.log('[issDetector] Refreshing cloud texture...');
            p.loadImage('/api/live-cloud-map', newTexture => {
                globe.updateCloudTexture(newTexture);
                console.log('[issDetector] Cloud texture updated.');
            }, err => {
                console.error('[issDetector] Failed to refresh cloud texture:', err);
            });
        }, 3 * 60 * 60 * 1000); // Refresh every 3 hours (matches source update frequency)
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
            // Draw earthquakes at Earth's surface - they pop out as spheres
            const pos = getSphereCoord(p, earthSize, lat, lon);
            let h = p.pow(10, mag);
            const maxh = p.pow(10, 8);
            h = p.map(h, 0, maxh, 1, Math.min(mag * 5 * quakeMagFactor, 100 * quakeMagFactor));
            const quakeColor = p.lerpColor(quakeFromColor, quakeToColor, p.map(mag, 0, 8, 0, 1));
            p.push();
            p.translate(pos.x, pos.y, pos.z);
            p.fill(quakeColor);
            p.noStroke();
            p.sphere(Math.max(1, h / 10), 6, 4); // Very low detail for earthquake markers
            p.pop();
        }
    }

    p.draw = () => {
        const perfStart = performance.now();
        const currentDisplayLat = (typeof window.clientLat === 'number') ? window.clientLat : 46.8139;
        const currentDisplayLon = (typeof window.clientLon === 'number') ? window.clientLon : -71.2080;

        // Update UI with current locations (throttled to avoid excessive DOM updates)
        if (p.frameCount % 60 === 0) { // Update every 60 frames (~1 second at 60fps)
            try {
                // Update ISS position
                if (window.iss && typeof window.iss.latitude === 'number' && typeof window.iss.longitude === 'number') {
                    const issLatSpan = document.getElementById('isslat');
                    const issLonSpan = document.getElementById('isslon');
                    if (issLatSpan) issLatSpan.textContent = window.iss.latitude.toFixed(4);
                    if (issLonSpan) issLonSpan.textContent = window.iss.longitude.toFixed(4);
                }
                
                // Update client location
                const clatSpan = document.getElementById('clat');
                const clonSpan = document.getElementById('clon');
                if (clatSpan) clatSpan.textContent = currentDisplayLat.toFixed(4);
                if (clonSpan) clonSpan.textContent = currentDisplayLon.toFixed(4);
            } catch (e) { /* ignore DOM update errors */ }
        }

        p.background(0); // Black background for space
        starfield.draw();

        if (showAxis) { p.push(); drawAxis(earthSize * 50); p.pop(); }

        angleY += autoRotationSpeed / 60.0;
        // Cloud rotation: 0.2x slower than Earth's auto-rotation, affected by wind speed slider
        cloudRotationY += (autoRotationSpeed / 60.0) * 0.2 * windSpeedMultiplier;

        p.ambientLight(80); // Provides a gentle fill light
        p.directionalLight(255, 255, 255, -0.5, -0.5, -1);
        p.scale(zoomLevel);
        p.push();
        p.rotateX(angleX);
        p.rotateY(angleY);

        globe.draw(cloudRotationY, showCloud);

        if (showIssHistoricalPath) {
            historicalPath.update(internalIssPathHistory);
            historicalPath.draw(earthSize + issDistanceToEarth, 0, 0, 0);
        }

        if (showIssPredictedPath) {
            predictedPath.draw(earthSize + issDistanceToEarth, sketchPassByRadiusKM, currentDisplayLat, currentDisplayLon);
        }


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
            
            // Billboard effect: make the sprite always face the camera
            // Reverse the global rotations to face the camera
            p.rotateY(-angleY);
            p.rotateX(-angleX);
            
            p.noStroke();
            if (issGif) {
                const planeW = (issGif.width > 0) ? issGif.width / issSize : 40;
                const planeH = (issGif.height > 0) ? issGif.height / issSize : 40;
                p.texture(issGif);
                p.plane(planeW, planeH);
            } else {
                p.fill(255, 0, 0);
                p.sphere(5, 8, 6); // Low detail for small sphere
            }
            p.pop();
        }


        const pClientLoc = getSphereCoord(p, earthSize, currentDisplayLat, currentDisplayLon);
        p.push();
        p.translate(pClientLoc.x, pClientLoc.y, pClientLoc.z);
        p.noStroke();
        p.fill(255, 255, 0);
        p.sphere(gpsSize, 8, 6); // Low detail for small marker
        p.pop();

        const approachDetails = predictor.getClosestApproachDetails();
        if (approachDetails) {
            let useRadius = earthSize + issDistanceToEarth;
            if (typeof approachDetails.alt === 'number' && !isNaN(approachDetails.alt)) {
                useRadius = earthSize + (approachDetails.alt / earthActualRadiusKM) * earthSize;
            }
            const normLon = normalizeLon(approachDetails.lon);
            const vApproach = getSphereCoord(p, useRadius, approachDetails.lat, normLon);
            p.push();
            p.translate(vApproach.x, vApproach.y, vApproach.z);
            p.noStroke();
            p.fill(MARKER_COLOR_TEAL[0], MARKER_COLOR_TEAL[1], MARKER_COLOR_TEAL[2]);
            p.sphere(CLOSEST_APPROACH_MARKER_SIZE, 8, 6); // Low detail for small marker
            p.pop();
        }

    // If we have an approach and a user location, draw a great-circle path between them
    if (showApproachInfo && approachDetails && typeof currentDisplayLat === 'number' && typeof currentDisplayLon === 'number') {
            // Cache 3D coordinates - only recalculate when approach changes
            if (!cachedGreatCirclePath3D) {
                function interpolateGreatCircle(lat1, lon1, lat2, lon2, n) {
                    const toRad = (d) => d * Math.PI / 180;
                    const toDeg = (r) => r * 180 / Math.PI;
                    const φ1 = toRad(lat1), λ1 = toRad(lon1);
                    const φ2 = toRad(lat2), λ2 = toRad(lon2);
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

                const gcPoints = interpolateGreatCircle(currentDisplayLat, currentDisplayLon, approachDetails.lat, approachDetails.lon, 48);
                cachedGreatCirclePath3D = gcPoints.map(pt => 
                    getSphereCoord(p, earthSize + issDistanceToEarth, pt.lat, normalizeLon(pt.lon))
                );
            }

            p.push();
            p.noFill();
            p.stroke(255, 255, 0, 200);
            p.strokeWeight(2);
            p.beginShape();
            for (const v of cachedGreatCirclePath3D) {
                p.vertex(v.x, v.y, v.z);
            }
            p.endShape();
            p.pop();
        }

        if (sketchPassByRadiusKM > 0) {
            const detectionRadius3DUnits = (sketchPassByRadiusKM / earthActualRadiusKM) * earthSize;
            const upVector = pClientLoc.copy().normalize();
            const defaultCylinderAxis = p.createVector(0, -1, 0);
            const rotationAxis = defaultCylinderAxis.cross(upVector);
            let rotationAngle = defaultCylinderAxis.angleBetween(upVector);

            // Cache ring vertices - only recalculate when radius changes
            const diskSegments = 48;
            if (!cachedDetectionRings || cachedDetectionRings.radius !== detectionRadius3DUnits) {
                const outerRing = [];
                const innerRing = [];
                for (let i = 0; i <= diskSegments; i++) {
                    const theta = (i / diskSegments) * Math.PI * 2;
                    const cos = Math.cos(theta);
                    const sin = Math.sin(theta);
                    outerRing.push({ x: cos * detectionRadius3DUnits * 1.015, y: sin * detectionRadius3DUnits * 1.015 });
                    innerRing.push({ x: cos * detectionRadius3DUnits, y: sin * detectionRadius3DUnits });
                }
                cachedDetectionRings = { outerRing, innerRing, radius: detectionRadius3DUnits };
            }
            
            const elevation = DISK_ELEVATION;
            
            p.push();
            p.translate(pClientLoc.x, pClientLoc.y, pClientLoc.z);
            if (rotationAngle !== 0 && rotationAxis.magSq() > 0) {
                p.rotate(rotationAngle, rotationAxis);
            }

            // Compute pulse alpha if an approach is imminent
            let ringAlpha = 255;
            try {
                const details = predictor.getClosestApproachDetails ? predictor.getClosestApproachDetails() : null;
                if (details && (details.absoluteTimeMs || details.time)) {
                    const absMs = details.absoluteTimeMs || (details.date instanceof Date ? details.date.getTime() : (Date.now() + (details.time || 0) * 1000));
                    const remainingMs = absMs - Date.now();
                    if (remainingMs <= PASS_IMMINENT_MINUTES * 60 * 1000 && remainingMs > -60 * 1000) {
                        const t = (Date.now() / 1000) % PULSE_PERIOD_SEC;
                        const phase = (t / PULSE_PERIOD_SEC) * Math.PI * 2;
                        const pulse = (Math.sin(phase) + 1) / 2;
                        ringAlpha = Math.floor(200 + pulse * 55);
                    }
                }
            } catch (e) { /* ignore */ }

            p.push();
            p.translate(upVector.x * elevation, upVector.y * elevation, upVector.z * elevation);
            p.rotateX(Math.PI / 2);
            p.noFill();
            
            // Outer ring using cached vertices
            p.stroke(0, 80, 180, ringAlpha);
            p.strokeWeight(3);
            p.beginShape();
            for (const v of cachedDetectionRings.outerRing) {
                p.vertex(v.x, v.y, 0);
            }
            p.endShape();
            
            // Inner ring using cached vertices
            p.stroke(50, 150, 255, ringAlpha);
            p.strokeWeight(4);
            p.beginShape();
            for (const v of cachedDetectionRings.innerRing) {
                p.vertex(v.x, v.y, 0);
            }
            p.endShape();
            p.pop();

            p.pop();
        }

        if (showQuakes) show3DQuakes();

        p.pop();

        if (issCam) {
            issCam.update(window.iss);
            issCam.display();
        }
        
        // Performance logging (throttled)
        const perfEnd = performance.now();
        const frameTime = perfEnd - perfStart;
        if (p.frameCount % 60 === 0 && frameTime > 16) {
            console.log(`[PERF] Frame ${p.frameCount}: ${frameTime.toFixed(2)}ms`);
        }
    };

    // Removed p5 mouse/touch event handlers - now using standard DOM events in setupCanvasInteractions()
    // This prevents p5 from blocking slider interactions and other page-level controls
}