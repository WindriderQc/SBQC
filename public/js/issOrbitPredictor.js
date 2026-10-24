import { haversineDistance } from './utils.js';

const TLE_URL = '/api/tle?format=json';
const TLE_CACHE_KEY = 'issTleCacheV2';
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;
const RETRY_AFTER_FAILURE_MS = 60 * 1000;
const PREDICTION_INTERVAL_SEC = 10;
const MAX_SEARCH_DURATION_SEC = 108 * 3600;
const DEFAULT_SLIDER_MAX_DURATION_SEC = 6 * 3600;

let currentRadiusKM = 1500;
let currentSliderDisplayDurationSec = 90 * 60;
let targetLat = 46.8139;
let targetLon = -71.2080;
let satrec;
let tleRecord = null;            // { name, line1, line2, epoch, source, fetchedAt, stale }
let tleStatus = { status: 'loading', reason: null };
let lastTleFailureMs = 0;
let tleLoadedAtMs = 0;
let lastComputedAtMs = null;
let fullCalculatedPath = [];
let timeToFirstClosePassSec = null;
let exposedClosestApproachDetails = null;

// Several modules listen to path updates (sketch and page controls).
const pathListeners = [];
let onPredictionUpdateCallback = null;

function useTleRecord(record) {
    if (!record || !record.line1 || !record.line2) return false;
    const rec = window.satellite.twoline2satrec(record.line1.trim(), record.line2.trim());
    if (!rec || rec.error) return false;
    satrec = rec;
    tleRecord = record;
    tleLoadedAtMs = Date.now();
    tleStatus = { status: record.stale ? 'stale' : 'ok', reason: null };
    return true;
}

async function fetchTLE({ force = false } = {}) {
    if (!force) {
        try {
            const cached = JSON.parse(localStorage.getItem(TLE_CACHE_KEY) || 'null');
            if (cached && Date.now() - cached.savedAtMs < CACHE_DURATION_MS && useTleRecord(cached.record)) return true;
        } catch (e) { /* storage unavailable or corrupt: fetch instead */ }
        if (Date.now() - lastTleFailureMs < RETRY_AFTER_FAILURE_MS) return !!satrec;
    }
    try {
        const res = await fetch(TLE_URL);
        const body = await res.json().catch(() => null);
        if (!res.ok || !body || body.status !== 'success') {
            throw new Error((body && (body.reason || body.message)) || `HTTP ${res.status}`);
        }
        const record = {
            name: body.name, line1: body.line1, line2: body.line2, epoch: body.epoch,
            source: body.source, fetchedAt: body.fetchedAt, stale: !!body.stale,
        };
        if (!useTleRecord(record)) throw new Error('unreadable TLE');
        try { localStorage.setItem(TLE_CACHE_KEY, JSON.stringify({ savedAtMs: Date.now(), record })); } catch (e) { /* ignore */ }
        return true;
    } catch (error) {
        console.error('Error fetching TLE:', error);
        lastTleFailureMs = Date.now();
        if (!satrec) tleStatus = { status: 'unavailable', reason: error.message };
        return !!satrec;
    }
}

function positionAt(time) {
    if (!satrec) return null;
    const propagateResult = window.satellite.propagate(satrec, time);
    if (!propagateResult || !propagateResult.position) return null;
    const { position } = propagateResult;
    const gmst = window.satellite.gstime(time);
    const geodetic = window.satellite.eciToGeodetic(position, gmst);
    return {
        lat: geodetic.latitude * 180 / Math.PI,
        lon: geodetic.longitude * 180 / Math.PI,
        alt: geodetic.height
    };
}

async function calculateFullPredictionAndDeterminePass() {
    if (!satrec || Date.now() - tleLoadedAtMs > CACHE_DURATION_MS) {
        const tleSetupSuccess = await fetchTLE();
        if (!tleSetupSuccess) {
            if (typeof onPredictionUpdateCallback === 'function') {
                onPredictionUpdateCallback({
                    closestPoint: null,
                    closestDist: Infinity,
                    sliderMax: DEFAULT_SLIDER_MAX_DURATION_SEC / 60,
                    sliderCurrent: DEFAULT_SLIDER_MAX_DURATION_SEC / 60
                });
            }
            displaySlicedPath(0);
            return;
        }
    }

    const now = new Date();
    lastComputedAtMs = now.getTime();
    fullCalculatedPath = [];
    timeToFirstClosePassSec = null;
    let closestPointInNextPass = null;
    let closestDistanceInNextPass = Infinity;
    let inPass = false;

    for (let t_sec = 0; t_sec < MAX_SEARCH_DURATION_SEC; t_sec += PREDICTION_INTERVAL_SEC) {
        const timeInstance = new Date(now.getTime() + t_sec * 1000);
        const pos = positionAt(timeInstance);
        if (pos) {
            fullCalculatedPath.push({ lat: pos.lat, lng: pos.lon, alt: pos.alt, time: t_sec, timeMs: timeInstance.getTime() });
        }
    }

    for (const point of fullCalculatedPath) {
        const dist = haversineDistance(point.lat, point.lng, targetLat, targetLon);
        if (dist < currentRadiusKM) {
            if (!inPass) {
                inPass = true;
                if (timeToFirstClosePassSec === null) {
                    timeToFirstClosePassSec = point.time;
                }
            }
            if (timeToFirstClosePassSec !== null && point.time >= timeToFirstClosePassSec) {
                if (dist < closestDistanceInNextPass) {
                    closestDistanceInNextPass = dist;
                    closestPointInNextPass = { time: point.time, dist, lat: point.lat, lon: point.lng, alt: point.alt };
                }
            }
        } else {
            if (inPass && timeToFirstClosePassSec !== null) break;
        }
    }

    let closestOverallDistance = fullCalculatedPath.length > 0 ? fullCalculatedPath.reduce((min, p) => {
        const dist = haversineDistance(p.lat, p.lng, targetLat, targetLon);
        return Math.min(min, dist);
    }, Infinity) : Infinity;

    // Store the closest approach details and also save an absolute timestamp (ms since epoch)
    if (closestPointInNextPass) {
        const absoluteMs = now.getTime() + (closestPointInNextPass.time || 0) * 1000;
        exposedClosestApproachDetails = Object.assign({}, closestPointInNextPass, { computedAtMs: now.getTime(), absoluteTimeMs: absoluteMs });
    } else {
        exposedClosestApproachDetails = null;
    }

    let sliderMaxDurationSec = timeToFirstClosePassSec !== null ? timeToFirstClosePassSec : DEFAULT_SLIDER_MAX_DURATION_SEC;
    sliderMaxDurationSec = Math.max(5 * 60, Math.min(sliderMaxDurationSec, MAX_SEARCH_DURATION_SEC));
    currentSliderDisplayDurationSec = sliderMaxDurationSec;

    if (typeof onPredictionUpdateCallback === 'function') {
        onPredictionUpdateCallback({
            closestPoint: closestPointInNextPass,
            closestDist: closestOverallDistance,
            sliderMax: sliderMaxDurationSec / 60,
            sliderCurrent: currentSliderDisplayDurationSec / 60
        });
    }
    
    displaySlicedPath(currentSliderDisplayDurationSec);
}

function displaySlicedPath(displayDurationSeconds) {
    const pointsToDisplay = fullCalculatedPath.filter(p => p.time <= displayDurationSeconds);
    for (const listener of pathListeners) {
        try { listener(pointsToDisplay); } catch (e) { console.warn('[predictor] path listener failed', e); }
    }
}

export function setOnPathUpdate(callback) {
    if (typeof callback === 'function' && !pathListeners.includes(callback)) pathListeners.push(callback);
}

export function setOnPredictionUpdate(callback) {
    onPredictionUpdateCallback = callback;
}

let predictionInFlight = null;
export async function fetchAndPredict() {
    if (!predictionInFlight) {
        predictionInFlight = calculateFullPredictionAndDeterminePass().finally(() => { predictionInFlight = null; });
    }
    return predictionInFlight;
}

export function setTargetLatLon(lat, lon) {
    if (typeof lat === 'number' && typeof lon === 'number') {
        targetLat = lat;
        targetLon = lon;
        calculateFullPredictionAndDeterminePass();
    }
}

export function getTargetLatLon() {
    return { lat: targetLat, lon: targetLon };
}

export async function refreshTLE() {
    const ok = await fetchTLE({ force: true });
    if (ok) await calculateFullPredictionAndDeterminePass();
    return ok;
}

export function setPredictionDurationSec(durationSeconds) {
    currentSliderDisplayDurationSec = durationSeconds;
    displaySlicedPath(currentSliderDisplayDurationSec);
}

export function setRadiusKM(radKM) {
    if (typeof radKM === 'number' && radKM > 0) {
        currentRadiusKM = radKM;
        calculateFullPredictionAndDeterminePass();
    }
}

export function getClosestApproachDetails() {
    return exposedClosestApproachDetails;
}

/**
 * Returns the closest approach details but converts the relative time (seconds from now)
 * into an absolute Date object (local time). If there is no closest approach, returns null.
 *
 * Returned shape (if present): { time: <seconds from now>, dist, lat, lon, alt, date: <Date> }
 */
export function getClosestApproachDetailsAsDate() {
    const details = exposedClosestApproachDetails;
    if (!details) return null;
    // Prefer the absolute timestamp if it was recorded at prediction time to avoid drift.
    const date = details.absoluteTimeMs ? new Date(details.absoluteTimeMs) : new Date(Date.now() + (details.time || 0) * 1000);
    return Object.assign({}, details, { date });
}

/**
 * Return the current ISS position propagated from the loaded TLE (if available).
 * Useful to compare the moving ISS position to the fixed closest-approach point.
 * Returns null if satrec or propagation is not available.
 */
export function getCurrentPosition() {
    try {
        const now = new Date();
        if (!satrec) return null;
        const pos = positionAt(now);
        return pos; // { lat, lon, alt }
    } catch (e) {
        return null;
    }
}
/** TLE in use and its freshness, for display and pass computation. */
export function getTleInfo() {
    return { ...tleStatus, record: tleRecord };
}

export function getLastComputedAtMs() {
    return lastComputedAtMs;
}

/**
 * Positions propagated from the loaded TLE between two instants. Used to show
 * the recent track as a computed line when recorded history is unavailable.
 */
export function computeTrack(startMs, endMs, stepSec = 30) {
    const out = [];
    if (!satrec) return out;
    for (let t = startMs; t <= endMs; t += stepSec * 1000) {
        const pos = positionAt(new Date(t));
        if (pos) out.push({ lat: pos.lat, lon: pos.lon, timeStamp: t, computed: true });
    }
    return out;
}
