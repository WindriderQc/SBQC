window.ISSOrbitPredictor = (function () {
    const TLE_URL = '/api/tle'; // Use our own server endpoint to get TLE data (handles server-side caching)
    const TLE_CACHE_KEY = 'tleDataCache'; // Key for localStorage TLE cache
    const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // Cache TLE data for 2 hours (in milliseconds)

    const PREDICTION_INTERVAL_SEC = 10; // Calculate points every 10 seconds
    const MAX_SEARCH_DURATION_SEC = 36 * 3600; // Max time to search for a pass (e.g., 36 hours)
    const DEFAULT_SLIDER_MAX_DURATION_SEC = 6 * 3600; // Default max for slider if no pass found (e.g., 6 hours)

    let currentRadiusKM = 1500; // Default, will be set by slider
    let currentSliderDisplayDurationSec = 90 * 60; // Default initial display, will be updated

    // Default target location (Quebec City). This can be updated to the client's location via setTargetLatLon().
    let targetLat = 46.8139; // Quebec City
    let targetLon = -71.2080;
    let satrec;

    let fullCalculatedPath = []; // Stores all points up to MAX_SEARCH_DURATION_SEC
    let timeToFirstClosePassSec = null; // Time in seconds to the first detected pass
    let exposedClosestApproachDetails = null; // Stores details of the closest approach

       // Fetches TLE data for ISS, using localStorage caching to reduce network requests
       // and avoid potential 403 errors from excessive downloads from Celestrak.
       async function fetchTLE() {
           // Try to retrieve and use cached TLE data if it's recent enough
           try {
               const cachedItem = localStorage.getItem(TLE_CACHE_KEY);
               if (cachedItem) {
                   const cachedEntry = JSON.parse(cachedItem);
                   // Check if the cached data is still valid (not older than CACHE_DURATION_MS)
                   if (Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS) {
                       console.log("[ISSOrbitPredictor] Using cached TLE data.");
                       const txt = cachedEntry.data;
                       const lines = txt.split('\n');
                       const i = lines.findIndex(l => l.includes('ISS (ZARYA)') || l.includes('ISS'));
                       if (i >= 0 && lines[i+1] && lines[i+2]) {
                           satrec = satellite.twoline2satrec(lines[i+1].trim(), lines[i+2].trim());
                           if (satrec) { // Check if satrec was successfully initialized
                               // console.log("[ISSOrbitPredictor] Set satrec from cached TLE.");
                               return true;
                           }
                       }
                       // If parsing failed or satrec is not valid from cache
                       console.error("[ISSOrbitPredictor] Could not parse TLE from cached text or satrec invalid.");
                       satrec = null;
                       localStorage.removeItem(TLE_CACHE_KEY); // Remove invalid cached data
                       return false;
                   } else {
                       console.log("[ISSOrbitPredictor] Cached TLE data expired.");
                   }
               }
           } catch (e) {
               console.error("[ISSOrbitPredictor] Error reading TLE from cache:", e);
               localStorage.removeItem(TLE_CACHE_KEY); // Clear corrupted cache
               satrec = null;
               return false;
           }

           // If cache is invalid, expired, or not present, fetch new TLE data from the network.
           try {
               console.log("[ISSOrbitPredictor] Fetching new TLE data from network.");
               const res = await fetch(TLE_URL);
               if (!res.ok) { // Check response status directly
                   console.error(`[ISSOrbitPredictor] Failed to fetch TLE: ${res.status}`);
                   satrec = null;
                   return false;
               }
               const txt = await res.text();

               // Store the newly fetched TLE data and current timestamp in localStorage.
               try {
                   const cacheEntry = { timestamp: Date.now(), data: txt };
                   localStorage.setItem(TLE_CACHE_KEY, JSON.stringify(cacheEntry));
                   console.log("[ISSOrbitPredictor] Fetched new TLE and updated cache.");
               } catch (e) {
                   console.error("[ISSOrbitPredictor] Error saving TLE to cache:", e);
                   // Potentially clear cache if quota exceeded, but for now just log
               }

               const lines = txt.split('\n');
               const i = lines.findIndex(l => l.includes('ISS (ZARYA)') || l.includes('ISS'));
               if (i >= 0 && lines[i+1] && lines[i+2]) {
                   satrec = satellite.twoline2satrec(lines[i+1].trim(), lines[i+2].trim());
                   if (satrec) { // Check if satrec was successfully initialized
                       return true;
                   }
               }
               // If parsing failed or satrec is not valid from fetched TLE
               console.error("[ISSOrbitPredictor] Could not parse TLE from fetched text or satrec invalid.");
               satrec = null;
               return false;
           } catch (error) {
               console.error("[ISSOrbitPredictor] Error fetching TLE:", error);
               satrec = null;
               return false;
           }
           // Fallback, though ideally all paths above should return.
           satrec = null;
           return false;
       }

       // Force-refresh TLE by clearing cache and fetching again
       async function refreshTLE() {
           try { localStorage.removeItem(TLE_CACHE_KEY); } catch (e) { /* ignore */ }
           return await fetchTLE();
       }

       function positionAt(time) {
           if (!satrec) return null;
           try {
               const propagateResult = satellite.propagate(satrec, time);
               if (!propagateResult || !propagateResult.position) {
                   // console.warn('[ISSOrbitPredictor] Propagation failed for time:', time);
                   return null;
               }
               const { position } = propagateResult;
               const gmst = satellite.gstime(time);
               const geodetic = satellite.eciToGeodetic(position, gmst);
               return {
                   lat: geodetic.latitude * 180 / Math.PI,
                   lon: geodetic.longitude * 180 / Math.PI,
                   alt: geodetic.height
               };
           } catch (e) {
               console.error("[ISSOrbitPredictor] Error in positionAt or propagate:", e);
               return null;
           }
       }

    function haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const toRad = angle => angle * Math.PI / 180;
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    // Generates the full path and finds the first close pass
    async function calculateFullPredictionAndDeterminePass() {
        if (!satrec) {
            const tleSetupSuccess = await fetchTLE();
            if (!tleSetupSuccess) {
                console.error("[ISSOrbitPredictor] TLE data (satrec) could not be initialized. Cannot calculate full prediction.");
                exposedClosestApproachDetails = null; // Ensure details are cleared on TLE error
                updatePassByText(null, Infinity); // Update text to show error/no pass
                updatePredictionLengthSlider(DEFAULT_SLIDER_MAX_DURATION_SEC / 60, DEFAULT_SLIDER_MAX_DURATION_SEC / 60); // Default slider range
                displaySlicedPath(0); // Display no path
                return;
            }
        }

        const now = new Date();
        fullCalculatedPath = [];
        timeToFirstClosePassSec = null;
        let closestOverallDistance = Infinity;
        let closestOverallPoint = null;

        for (let t_sec = 0; t_sec < MAX_SEARCH_DURATION_SEC; t_sec += PREDICTION_INTERVAL_SEC) {
            const timeInstance = new Date(now.getTime() + t_sec * 1000);
            const pos = positionAt(timeInstance);
            if (pos) {
                fullCalculatedPath.push({ lat: pos.lat, lng: pos.lon, alt: pos.alt, time: t_sec });
                const dist = haversineDistance(pos.lat, pos.lon, targetLat, targetLon);
                if (dist < closestOverallDistance) {
                    closestOverallDistance = dist;
                    closestOverallPoint = { time: t_sec, dist, ...pos };
                }
                if (dist < currentRadiusKM && timeToFirstClosePassSec === null) {
                    timeToFirstClosePassSec = t_sec;
                    console.log(`[ISSOrbitPredictor] First close pass detected at ${t_sec/60} mins, dist: ${dist.toFixed(0)}km`);
                }
            }
        }
        console.log(`[ISSOrbitPredictor] Full path calculated. Points: ${fullCalculatedPath.length}. Closest overall: ${closestOverallDistance.toFixed(0)}km at ${closestOverallPoint ? closestOverallPoint.time/60 : 'N/A'} mins.`);

        if (closestOverallPoint && closestOverallDistance < currentRadiusKM) {
            exposedClosestApproachDetails = {
                lat: closestOverallPoint.lat,
                lon: closestOverallPoint.lon,
                alt: closestOverallPoint.alt, // Assumes alt is part of closestOverallPoint from '...pos'
                time: closestOverallPoint.time,
                dist: closestOverallDistance
            };
            // console.log('[ISSOrbitPredictor] Closest approach details updated:', exposedClosestApproachDetails);
        } else {
            exposedClosestApproachDetails = null;
            // console.log('[ISSOrbitPredictor] No close approach within radius, details cleared.');
        }

        updatePassByText(closestOverallPoint, closestOverallDistance);

        let sliderMaxDurationSec = timeToFirstClosePassSec !== null ? timeToFirstClosePassSec : DEFAULT_SLIDER_MAX_DURATION_SEC;
        // Ensure slider max is not less than a minimum (e.g. 5 mins) and not more than full search
        sliderMaxDurationSec = Math.max(5 * 60, Math.min(sliderMaxDurationSec, MAX_SEARCH_DURATION_SEC));
        currentSliderDisplayDurationSec = sliderMaxDurationSec; // Start by showing path up to pass or default max

        updatePredictionLengthSlider(sliderMaxDurationSec / 60, currentSliderDisplayDurationSec / 60);
        displaySlicedPath(currentSliderDisplayDurationSec);
    }

    function updatePassByText(closestPointData, closestDistVal) {
        const passByStatus = document.getElementById('iss-passby-time');
        if (!passByStatus) return;

        if (closestPointData && closestPointData.dist < currentRadiusKM) {
            const nowMs = Date.now();
            const approachMs = nowMs + closestPointData.time * 1000;
            const approachDate = new Date(approachMs);
            const minutesUntil = Math.round(closestPointData.time / 60);
            const minutesText = minutesUntil <= 0 ? '<1' : minutesUntil.toString();
            passByStatus.textContent = `in ${minutesText} min (at ${approachDate.toLocaleTimeString()}) — ~${Math.round(closestPointData.dist)} km — TLE based.`;
        } else {
            passByStatus.textContent = `No close pass predicted within ${currentRadiusKM} km for the next ${MAX_SEARCH_DURATION_SEC/3600} hrs. Closest ~${closestDistVal.toFixed(0)} km. TLE based.`;
        }
    }

    function updatePredictionLengthSlider(maxMinutes, currentMinutes) {
        const slider = document.getElementById('predictionLengthSlider');
        const valueSpan = document.getElementById('predictionLengthValue');

        if (!slider) {
            console.error("[ISSOrbitPredictor] predictionLengthSlider DOM element not found.");
            return; // Gracefully exit if slider is missing
        }
        if (!valueSpan) {
            console.error("[ISSOrbitPredictor] predictionLengthValue DOM element not found.");
            // Depending on desired behavior, you might still want to update the slider if it exists,
            // but for now, we'll also return if the valueSpan is missing.
            return;
        }

        // Proceed with original logic only if both elements are found
        if (typeof maxMinutes === 'number' && !isNaN(maxMinutes)) {
            slider.max = maxMinutes.toString();
        } else {
            console.warn("[ISSOrbitPredictor] Invalid maxMinutes for predictionLengthSlider:", maxMinutes);
        }

        if (typeof currentMinutes === 'number' && !isNaN(currentMinutes)) {
            slider.value = currentMinutes.toString();
            valueSpan.textContent = currentMinutes.toString();
        } else {
            console.warn("[ISSOrbitPredictor] Invalid currentMinutes for predictionLengthSlider:", currentMinutes);
            // Optionally set a default text for valueSpan if currentMinutes is invalid
            // valueSpan.textContent = 'N/A';
        }
    }

    function displaySlicedPath(displayDurationSeconds) {
        const pointsToDisplay = fullCalculatedPath.filter(p => p.time <= displayDurationSeconds);
        if (window.earth3DSketch && typeof window.earth3DSketch.updatePredictedPath === 'function') {
            window.earth3DSketch.updatePredictedPath(pointsToDisplay);
        }
    }

    return {
        fetchAndPredict: async function () {
            await calculateFullPredictionAndDeterminePass();
        },
        setTargetLatLon: function(lat, lon) {
            if (typeof lat === 'number' && typeof lon === 'number') {
                targetLat = lat;
                targetLon = lon;
                // Recalculate prediction for new target
                calculateFullPredictionAndDeterminePass();
            }
        },
        getTargetLatLon: function() {
            return { lat: targetLat, lon: targetLon };
        },
        refreshTLE: async function() {
            const ok = await refreshTLE();
            if (ok) await calculateFullPredictionAndDeterminePass();
            return ok;
        },
        setPredictionDurationSec: function(durationSeconds) {
            currentSliderDisplayDurationSec = durationSeconds;
            displaySlicedPath(currentSliderDisplayDurationSec);
            // No need to call generatePredictedPath, just redisplay a portion of existing full path
        },
        setRadiusKM: function(radKM) {
            if (typeof radKM === 'number' && radKM > 0) currentRadiusKM = radKM;
            // Recalculate to find new timeToFirstClosePassSec and update slider/text
            // This will re-use existing TLE if already fetched and satrec is valid.
            calculateFullPredictionAndDeterminePass();
        },
        getClosestApproachDetails: function() {
            return exposedClosestApproachDetails;
        }
    };
})();