import { haversineDistance } from './utils.js';

const TLE_URL = '/api/tle';
const TLE_CACHE_KEY = 'tleDataCache';
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000;
const PREDICTION_INTERVAL_SEC = 10;
const MAX_SEARCH_DURATION_SEC = 108 * 3600;
const DEFAULT_SLIDER_MAX_DURATION_SEC = 6 * 3600;

let currentRadiusKM = 1500;
let currentSliderDisplayDurationSec = 90 * 60;
let targetLat = 46.8139;
let targetLon = -71.2080;
let satrec;
let fullCalculatedPath = [];
let timeToFirstClosePassSec = null;
let exposedClosestApproachDetails = null;

// Callback functions to be set by the main script
let onPathUpdateCallback = null;
let onPredictionUpdateCallback = null;

async function fetchTLE() {
    const cachedItem = localStorage.getItem(TLE_CACHE_KEY);
    if (cachedItem) {
        const cachedEntry = JSON.parse(cachedItem);
        if (Date.now() - cachedEntry.timestamp < CACHE_DURATION_MS) {
            const lines = cachedEntry.data.split('\n');
            const i = lines.findIndex(l => l.includes('ISS'));
            if (i >= 0 && lines[i + 1] && lines[i + 2]) {
                satrec = window.satellite.twoline2satrec(lines[i + 1].trim(), lines[i + 2].trim());
                if (satrec) return true;
            }
        }
    }
    try {
        const res = await fetch(TLE_URL);
        if (!res.ok) return false;
        const txt = await res.text();
        localStorage.setItem(TLE_CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: txt }));
        const lines = txt.split('\n');
        const i = lines.findIndex(l => l.includes('ISS'));
        if (i >= 0 && lines[i + 1] && lines[i + 2]) {
            satrec = window.satellite.twoline2satrec(lines[i + 1].trim(), lines[i + 2].trim());
            return !!satrec;
        }
    } catch (error) {
        console.error("Error fetching TLE:", error);
        return false;
    }
    return false;
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
    if (!satrec) {
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
    fullCalculatedPath = [];
    timeToFirstClosePassSec = null;
    let closestPointInNextPass = null;
    let closestDistanceInNextPass = Infinity;
    let inPass = false;

    for (let t_sec = 0; t_sec < MAX_SEARCH_DURATION_SEC; t_sec += PREDICTION_INTERVAL_SEC) {
        const timeInstance = new Date(now.getTime() + t_sec * 1000);
        const pos = positionAt(timeInstance);
        if (pos) {
            fullCalculatedPath.push({ lat: pos.lat, lng: pos.lon, alt: pos.alt, time: t_sec });
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

    exposedClosestApproachDetails = closestPointInNextPass;

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
    if (typeof onPathUpdateCallback === 'function') {
        onPathUpdateCallback(pointsToDisplay);
    }
}

export function setOnPathUpdate(callback) {
    onPathUpdateCallback = callback;
}

export function setOnPredictionUpdate(callback) {
    onPredictionUpdateCallback = callback;
}

export async function fetchAndPredict() {
    await calculateFullPredictionAndDeterminePass();
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
    const ok = await fetchTLE();
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