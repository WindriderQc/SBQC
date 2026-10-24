// ISS passes over an observer, computed locally from a TLE.
//
// A geometric pass is the time the station is above the horizon. It is
// observable to the naked eye only when, at the same moment, the station is
// high enough, lit by the Sun, and the observer's sky is dark. Weather,
// obstacles and light pollution are not known here.
//
// The satellite.js library is passed in (window.satellite in the browser,
// the npm package in tests) so this module has no imports.

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const EARTH_RADIUS_KM = 6378.137;
const AU_KM = 149597870.7;

export const DEFAULTS = Object.freeze({
    hours: 72,
    stepSec: 20,
    minObservableElevationDeg: 10,
    maxSunElevationDeg: -6, // civil twilight or darker
    maxPasses: 12,
});

const DIRECTIONS_FR = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];

export function directionFr(azDeg) {
    const i = Math.round((((azDeg % 360) + 360) % 360) / 22.5) % 16;
    return DIRECTIONS_FR[i];
}

// Low-precision Sun position (Astronomical Almanac), about 0.01 degree.
// Returns an inertial vector in km, equator and equinox of date.
export function sunEciKm(date) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const n = jd - 2451545.0;
    const L = (280.460 + 0.9856474 * n) * RAD;
    const g = (357.528 + 0.9856003 * n) * RAD;
    const lambda = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
    const eps = (23.439 - 0.0000004 * n) * RAD;
    const r = (1.00014 - 0.01671 * Math.cos(g) - 0.00014 * Math.cos(2 * g)) * AU_KM;
    return {
        x: r * Math.cos(lambda),
        y: r * Math.cos(eps) * Math.sin(lambda),
        z: r * Math.sin(eps) * Math.sin(lambda),
    };
}

// Cylindrical Earth shadow; penumbra ignored.
export function isSunlit(satEci, sunEci) {
    const sl = Math.hypot(sunEci.x, sunEci.y, sunEci.z);
    const s = { x: sunEci.x / sl, y: sunEci.y / sl, z: sunEci.z / sl };
    const proj = satEci.x * s.x + satEci.y * s.y + satEci.z * s.z;
    if (proj > 0) return true;
    const px = satEci.x - proj * s.x;
    const py = satEci.y - proj * s.y;
    const pz = satEci.z - proj * s.z;
    return Math.hypot(px, py, pz) > EARTH_RADIUS_KM;
}

function makeObserver(lat, lon, heightKm) {
    return { latitude: lat * RAD, longitude: lon * RAD, height: heightKm || 0 };
}

function sample(sat, satrec, observerGd, date) {
    const pv = sat.propagate(satrec, date);
    if (!pv || !pv.position || typeof pv.position.x !== 'number') return null;
    const gmst = sat.gstime(date);
    const look = sat.ecfToLookAngles(observerGd, sat.eciToEcf(pv.position, gmst));
    return { date, eci: pv.position, gmst, elDeg: look.elevation * DEG, azDeg: ((look.azimuth * DEG) % 360 + 360) % 360 };
}

function sunElevationDeg(sat, observerGd, date, gmst) {
    const sunEcf = sat.eciToEcf(sunEciKm(date), gmst);
    return sat.ecfToLookAngles(observerGd, sunEcf).elevation * DEG;
}

function point(s) {
    return { time: s.date.toISOString(), azDeg: round1(s.azDeg), direction: directionFr(s.azDeg), elDeg: round1(s.elDeg) };
}

function round1(x) { return Math.round(x * 10) / 10; }

// Bisection on the horizon crossing between two samples (one below, one above).
function refineCrossing(sat, satrec, obs, below, above) {
    let lo = below, hi = above;
    while (Math.abs(hi.date - lo.date) > 1000) {
        const mid = sample(sat, satrec, obs, new Date((lo.date.getTime() + hi.date.getTime()) / 2));
        if (!mid) break;
        if (mid.elDeg >= 0) hi = mid; else lo = mid;
    }
    return hi;
}

function refineMaximum(sat, satrec, obs, around, stepMs) {
    let a = around.date.getTime() - stepMs;
    let b = around.date.getTime() + stepMs;
    let best = around;
    for (let k = 0; k < 30 && b - a > 500; k++) {
        const m1 = a + (b - a) / 3;
        const m2 = b - (b - a) / 3;
        const s1 = sample(sat, satrec, obs, new Date(m1));
        const s2 = sample(sat, satrec, obs, new Date(m2));
        if (!s1 || !s2) break;
        if (s1.elDeg < s2.elDeg) a = m1; else b = m2;
        const s = s1.elDeg > s2.elDeg ? s1 : s2;
        if (s.elDeg > best.elDeg) best = s;
    }
    return best;
}

function describeVisibility(sat, satrec, obs, rise, set, opts) {
    const stepMs = 10000;
    let first = null, last = null, top = null;
    let sawHigh = false, sawDarkHigh = false;
    let minSunElHigh = Infinity;
    for (let t = rise.date.getTime(); t <= set.date.getTime(); t += stepMs) {
        const s = sample(sat, satrec, obs, new Date(t));
        if (!s || s.elDeg < opts.minObservableElevationDeg) continue;
        sawHigh = true;
        const sunEl = sunElevationDeg(sat, obs, s.date, s.gmst);
        minSunElHigh = Math.min(minSunElHigh, sunEl);
        if (sunEl > opts.maxSunElevationDeg) continue;
        sawDarkHigh = true;
        if (!isSunlit(s.eci, sunEciKm(s.date))) continue;
        if (!first) first = s;
        last = s;
        if (!top || s.elDeg > top.elDeg) top = s;
    }
    if (first) {
        return {
            observable: true,
            reasons: [],
            visible: {
                start: point(first),
                end: point(last),
                maxElDeg: round1(top.elDeg),
                durationSec: Math.round((last.date - first.date) / 1000),
            },
        };
    }
    const reasons = [];
    if (!sawHigh) reasons.push({ code: 'too_low', text: `trop basse sur l'horizon (moins de ${opts.minObservableElevationDeg}°)` });
    else if (!sawDarkHigh) reasons.push({ code: 'daylight', text: `le ciel n'est pas assez sombre (soleil à ${Math.round(minSunElHigh)}° au mieux)` });
    else reasons.push({ code: 'earth_shadow', text: "l'ISS est dans l'ombre de la Terre, donc non éclairée" });
    return { observable: false, reasons, visible: null };
}

/**
 * Lists passes above the horizon, each classified as observable or not.
 * @param {object} sat - satellite.js namespace
 * @param {object} tle - { line1, line2, epoch?, source?, fetchedAt? }
 * @param {object} observer - { lat, lon, heightKm? }
 * @param {object} [options] - { start: Date, hours, stepSec, minObservableElevationDeg, maxSunElevationDeg, maxPasses }
 */
export function computePasses(sat, tle, observer, options = {}) {
    const opts = { ...DEFAULTS, ...options };
    const start = options.start instanceof Date ? options.start : new Date();
    const satrec = sat.twoline2satrec(tle.line1.trim(), tle.line2.trim());
    const obs = makeObserver(observer.lat, observer.lon, observer.heightKm);
    const stepMs = opts.stepSec * 1000;
    const endMs = start.getTime() + opts.hours * 3600000;

    const passes = [];
    let prev = sample(sat, satrec, obs, start);
    if (!prev) throw new Error('TLE propagation failed');
    let rise = prev.elDeg >= 0 ? prev : null;
    let inProgressAtStart = prev.elDeg >= 0;
    let maxS = rise;

    for (let t = start.getTime() + stepMs; t <= endMs && passes.length < opts.maxPasses; t += stepMs) {
        const cur = sample(sat, satrec, obs, new Date(t));
        if (!cur) break;
        if (!rise && prev.elDeg < 0 && cur.elDeg >= 0) {
            rise = refineCrossing(sat, satrec, obs, prev, cur);
            maxS = cur;
        } else if (rise && cur.elDeg >= 0) {
            if (!maxS || cur.elDeg > maxS.elDeg) maxS = cur;
        } else if (rise && cur.elDeg < 0) {
            const set = refineCrossing(sat, satrec, obs, cur, prev);
            const top = refineMaximum(sat, satrec, obs, maxS || prev, stepMs);
            const vis = describeVisibility(sat, satrec, obs, rise, set, opts);
            passes.push({
                rise: point(rise),
                max: point(top),
                set: point(set),
                durationSec: Math.round((set.date - rise.date) / 1000),
                inProgressAtStart,
                ...vis,
            });
            rise = null;
            maxS = null;
            inProgressAtStart = false;
        }
        prev = cur;
    }

    return {
        computedAt: new Date().toISOString(),
        window: { start: start.toISOString(), end: new Date(endMs).toISOString() },
        observer: { lat: observer.lat, lon: observer.lon, heightKm: observer.heightKm || 0, label: observer.label || null },
        tle: { epoch: tle.epoch || null, source: tle.source || null, fetchedAt: tle.fetchedAt || null, stale: !!tle.stale },
        rules: {
            geometric: 'above the horizon (0°)',
            observable: `≥ ${opts.minObservableElevationDeg}° high, station sunlit, Sun ≤ ${opts.maxSunElevationDeg}° at the observer`,
            notConsidered: ['weather and clouds', 'local obstacles', 'light pollution', 'brightness (magnitude)'],
        },
        passes,
    };
}
