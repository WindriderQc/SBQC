'use strict';

// ISS orbital elements (TLE) and recorded ISS positions (DataAPI history).
// Every answer carries its source and timestamps so the page can show how
// fresh the data is. A failure is reported as unavailable, never replaced by
// invented positions.

const fetch = require('node-fetch');

const ISS_NORAD_ID = '25544';
const DEFAULT_TLE_URL = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${ISS_NORAD_ID}&FORMAT=TLE`;
const TLE_CACHE_MS = 2 * 60 * 60 * 1000; // CelesTrak asks clients not to poll more often
const TLE_RETRY_AFTER_FAILURE_MS = 10 * 60 * 1000;
const TLE_STALE_AFTER_EPOCH_MS = 3 * 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 15000;
const HISTORY_CACHE_MS = 60 * 1000;

class IssDataUnavailable extends Error {
    constructor(message, { source, reason } = {}) {
        super(message);
        this.name = 'IssDataUnavailable';
        this.source = source;
        this.reason = reason;
    }
}

let fetchImpl = fetch;
let tleCache = null;          // { record, fetchedAtMs }
let tleLastFailure = null;    // { atMs, message }
let historyCache = null;      // { payload, fetchedAtMs }

function setFetchForTests(fn) {
    fetchImpl = fn || fetch;
    tleCache = null;
    tleLastFailure = null;
    historyCache = null;
}

async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetchImpl(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// Epoch field of TLE line 1, columns 19-32: YYDDD.DDDDDDDD (UTC).
function tleEpochMs(line1) {
    const field = line1.substring(18, 32).trim();
    const yy = parseInt(field.substring(0, 2), 10);
    const dayOfYear = parseFloat(field.substring(2));
    if (!Number.isFinite(yy) || !Number.isFinite(dayOfYear)) return null;
    const year = yy < 57 ? 2000 + yy : 1900 + yy;
    return Date.UTC(year, 0, 1) + (dayOfYear - 1) * 86400000;
}

function parseIssTle(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim());
    const i1 = lines.findIndex(l => l.startsWith(`1 ${ISS_NORAD_ID}`));
    if (i1 < 0 || !lines[i1 + 1] || !lines[i1 + 1].startsWith(`2 ${ISS_NORAD_ID}`)) {
        throw new Error('response does not contain an ISS (25544) two-line element set');
    }
    const line1 = lines[i1];
    const line2 = lines[i1 + 1];
    if (line1.length < 69 || line2.length < 69) throw new Error('truncated TLE lines');
    const name = (i1 > 0 && !/^[12] /.test(lines[i1 - 1]) ? lines[i1 - 1].trim() : 'ISS (ZARYA)');
    const epochMs = tleEpochMs(line1);
    if (!epochMs) throw new Error('unreadable TLE epoch');
    return { name, line1, line2, epochMs };
}

async function getIssTle({ nowMs = Date.now() } = {}) {
    if (tleCache && nowMs - tleCache.fetchedAtMs < TLE_CACHE_MS) {
        return decorateTle(tleCache, nowMs, false);
    }
    const retryBlocked = tleLastFailure && nowMs - tleLastFailure.atMs < TLE_RETRY_AFTER_FAILURE_MS;
    if (!retryBlocked) {
        const url = process.env.TLE_SOURCE_URL || DEFAULT_TLE_URL;
        try {
            const res = await fetchWithTimeout(url, { headers: { 'User-Agent': 'SBQC-ISS-Tracker (specialblend.ca)' } });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const record = parseIssTle(await res.text());
            record.source = new URL(url).host;
            tleCache = { record, fetchedAtMs: nowMs };
            tleLastFailure = null;
            return decorateTle(tleCache, nowMs, false);
        } catch (err) {
            tleLastFailure = { atMs: nowMs, message: err.name === 'AbortError' ? 'timeout' : err.message };
            console.error(`[iss] TLE fetch failed (${url}): ${tleLastFailure.message}`);
        }
    }
    if (tleCache) return decorateTle(tleCache, nowMs, true);
    throw new IssDataUnavailable('ISS orbital elements are unavailable', {
        source: 'celestrak',
        reason: tleLastFailure ? tleLastFailure.message : 'no data',
    });
}

function decorateTle(cache, nowMs, refreshFailed) {
    const { record, fetchedAtMs } = cache;
    const epochAgeMs = nowMs - record.epochMs;
    return {
        ...record,
        fetchedAtMs,
        refreshFailed,
        stale: refreshFailed || epochAgeMs > TLE_STALE_AFTER_EPOCH_MS,
        epochAgeHours: Math.round(epochAgeMs / 36e5 * 10) / 10,
    };
}

function dataApiBaseUrl() {
    const base = process.env.DATA_API_URL || '';
    return base + (process.env.DATA_API_PORT ? ':' + process.env.DATA_API_PORT : '');
}

// DataAPI protects /api/v1 with a session or its tool key (x-api-key).
async function getIssHistory({ nowMs = Date.now() } = {}) {
    if (historyCache && nowMs - historyCache.fetchedAtMs < HISTORY_CACHE_MS) return historyCache.payload;
    const key = process.env.DATAAPI_API_KEY;
    if (!dataApiBaseUrl()) {
        throw new IssDataUnavailable('ISS history source is not configured', { source: 'dataapi', reason: 'DATA_API_URL missing' });
    }
    if (!key) {
        throw new IssDataUnavailable('ISS history source is not configured', { source: 'dataapi', reason: 'DATAAPI_API_KEY missing on the SBQC server' });
    }
    let res;
    try {
        res = await fetchWithTimeout(`${dataApiBaseUrl()}/api/v1/iss`, { headers: { 'x-api-key': key, Accept: 'application/json' } });
    } catch (err) {
        throw new IssDataUnavailable('ISS history source did not answer', { source: 'dataapi', reason: err.name === 'AbortError' ? 'timeout' : err.message });
    }
    if (!res.ok) {
        const reason = res.status === 401 ? 'DataAPI refused the key (401)' : `DataAPI HTTP ${res.status}`;
        throw new IssDataUnavailable('ISS history source refused the request', { source: 'dataapi', reason });
    }
    const body = await res.json();
    const data = Array.isArray(body && body.data) ? body.data : [];
    let latestMs = null;
    let oldestMs = null;
    for (const pt of data) {
        const t = new Date(pt.timeStamp).getTime();
        if (!Number.isFinite(t)) continue;
        if (latestMs === null || t > latestMs) latestMs = t;
        if (oldestMs === null || t < oldestMs) oldestMs = t;
    }
    const payload = {
        status: 'success',
        message: body && body.message,
        meta: {
            ...(body && body.meta),
            source: 'DataAPI',
            fetchedAt: new Date(nowMs).toISOString(),
            oldest: oldestMs ? new Date(oldestMs).toISOString() : null,
            latest: latestMs ? new Date(latestMs).toISOString() : null,
            latestAgeSec: latestMs ? Math.round((nowMs - latestMs) / 1000) : null,
        },
        data,
    };
    historyCache = { payload, fetchedAtMs: nowMs };
    return payload;
}

module.exports = {
    IssDataUnavailable,
    getIssTle,
    getIssHistory,
    parseIssTle,
    tleEpochMs,
    setFetchForTests,
    DEFAULT_TLE_URL,
};
