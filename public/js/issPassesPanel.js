// "Prochains passages" and data-status panels of the ISS page.
// Everything is computed in the browser: the observer position never leaves it.

import * as predictor from './issOrbitPredictor.js';
import { computePasses } from './issPasses.js';

const DEFAULT_PLACE = { lat: 46.8139, lon: -71.2080, label: 'Québec (position par défaut)' };
const RECOMPUTE_MS = 10 * 60 * 1000;
const HISTORY_STALE_SEC = 15 * 60;

let observer = { ...DEFAULT_PLACE };
let lastResult = null;

const tz = (() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'heure locale'; } catch (e) { return 'heure locale'; }
})();
const fmtDay = new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtTime = new Intl.DateTimeFormat('fr-CA', { hour: '2-digit', minute: '2-digit' });
const fmtTimeSec = new Intl.DateTimeFormat('fr-CA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtStamp = new Intl.DateTimeFormat('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });

function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'style') node.style.cssText = v;
        else node.setAttribute(k, v);
    }
    for (const c of children) if (c !== null && c !== undefined) node.append(c);
    return node;
}

function ago(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    if (s < 90) return `${s} s`;
    const m = Math.round(s / 60);
    if (m < 90) return `${m} min`;
    const h = Math.round(m / 6) / 10;
    if (h < 48) return `${h} h`;
    return `${Math.round(h / 24)} j`;
}

function deg(x) {
    return `${String(x).replace('.', ',')}°`;
}

function minutes(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
}

function sameDayLabel(d) {
    return fmtDay.format(d);
}

// --- Data status ---------------------------------------------------------

function renderStatus() {
    const box = document.getElementById('iss-data-status');
    if (!box) return;
    const st = window.issDataStatus || {};
    const rows = [];

    const tle = predictor.getTleInfo();
    if (tle.record) {
        const epoch = new Date(tle.record.epoch);
        rows.push(['Orbite (TLE)', `${tle.record.source || 'CelesTrak'}, époque ${fmtStamp.format(epoch)} (il y a ${ago(Date.now() - epoch)})${tle.record.stale ? ' — ancienne, à rafraîchir' : ''}`, tle.record.stale ? 'warn' : 'ok']);
    } else if (tle.status === 'unavailable') {
        rows.push(['Orbite (TLE)', `indisponible : ${tle.reason}`, 'bad']);
    } else {
        rows.push(['Orbite (TLE)', 'chargement…', 'wait']);
    }

    const h = st.history || {};
    if (h.status === 'ok') {
        const latestAge = h.latest ? (Date.now() - new Date(h.latest)) / 1000 : null;
        const stale = latestAge !== null && latestAge > HISTORY_STALE_SEC;
        rows.push(['Historique enregistré', `${h.count} positions DataAPI${h.latest ? `, dernière il y a ${ago(latestAge * 1000)}` : ''}${stale ? ' — l’enregistrement semble arrêté' : ''}`, stale ? 'warn' : 'ok']);
    } else if (h.status === 'loading') {
        rows.push(['Historique enregistré', 'chargement…', 'wait']);
    } else {
        const computed = st.computedTrack ? ` La trace bleue des ${st.computedTrack.hours} dernières heures est calculée à partir du TLE, pas enregistrée.` : '';
        rows.push(['Historique enregistré', `indisponible (${h.reason || h.status}).${computed}`, 'bad']);
    }

    const liveMs = window.issLastLiveMs;
    if (liveMs) {
        rows.push(['Position en direct', `reçue il y a ${ago(Date.now() - liveMs)}`, Date.now() - liveMs > 60000 ? 'warn' : 'ok']);
    } else {
        rows.push(['Position en direct', 'aucune reçue depuis l’ouverture : le marqueur suit la position calculée (TLE)', 'warn']);
    }

    rows.push(['Nuages', 'image sans date de clouds.matteason.co.uk : décor indicatif, pas la météo actuelle', 'warn']);

    const colors = { ok: '#198754', warn: '#b58100', bad: '#dc3545', wait: '#6c757d' };
    box.replaceChildren(...rows.map(([k, v, level]) => el('div', { style: 'margin-bottom:4px' },
        el('span', { style: `display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:8px;background:${colors[level]}` }),
        el('strong', {}, `${k} : `), v)));
}

// --- Passes --------------------------------------------------------------

function passRow(pass) {
    const rise = new Date(pass.rise.time);
    const set = new Date(pass.set.time);
    const verdict = pass.observable
        ? el('span', { style: 'color:#198754;font-weight:600' }, `Visible ${fmtTime.format(new Date(pass.visible.start.time))}–${fmtTime.format(new Date(pass.visible.end.time))}`)
        : el('span', { style: 'color:#6c757d' }, `Non observable : ${pass.reasons.map(r => r.text).join(', ')}`);
    return el('tr', {},
        el('td', {}, sameDayLabel(rise)),
        el('td', {}, `${fmtTime.format(rise)} (${pass.rise.direction})`),
        el('td', {}, `${deg(pass.max.elDeg)} vers ${pass.max.direction} à ${fmtTime.format(new Date(pass.max.time))}`),
        el('td', {}, `${fmtTime.format(set)} (${pass.set.direction})`),
        el('td', {}, minutes(pass.durationSec)),
        el('td', {}, verdict));
}

function renderPasses(result) {
    const box = document.getElementById('iss-passes');
    if (!box) return;
    const next = result.passes.find(p => p.observable);
    const headline = next
        ? el('div', { style: 'font-size:1.05rem;margin-bottom:8px' },
            el('strong', {}, 'Prochain passage visible à l’œil nu : '),
            `${sameDayLabel(new Date(next.visible.start.time))}, de ${fmtTimeSec.format(new Date(next.visible.start.time))} à ${fmtTimeSec.format(new Date(next.visible.end.time))}, `,
            `de ${next.visible.start.direction} vers ${next.visible.end.direction}, hauteur max ${deg(next.visible.maxElDeg)} (${minutes(next.visible.durationSec)}), si le ciel est dégagé.`)
        : el('div', { style: 'font-size:1.05rem;margin-bottom:8px' },
            el('strong', {}, `Aucun passage visible à l’œil nu dans les ${Math.round((new Date(result.window.end) - new Date(result.window.start)) / 3600000)} prochaines heures.`),
            ' Les passages ci-dessous sont seulement géométriques (au-dessus de l’horizon).');

    const table = el('table', { class: 'table table-sm', style: 'font-size:0.9rem' },
        el('thead', {}, el('tr', {}, ...['Jour', 'Lever', 'Point le plus haut', 'Coucher', 'Durée', 'Observable ?'].map(t => el('th', {}, t)))),
        el('tbody', {}, ...result.passes.map(passRow)));

    const tleNote = result.tle.epoch ? `TLE ${result.tle.source || ''} époque ${fmtStamp.format(new Date(result.tle.epoch))}` : 'TLE';
    const meta = el('div', { class: 'text-muted', style: 'font-size:0.8rem;margin-top:6px' },
        `Lieu : ${observer.label}. Heures en ${tz}. Calculé le ${fmtStamp.format(new Date(result.computedAt))} à partir du ${tleNote}. `,
        'Passage géométrique = au-dessus de l’horizon. Observable = au moins 10° de hauteur, ISS éclairée par le Soleil et ciel assez sombre (Soleil à −6° ou plus bas). ',
        'Non pris en compte : nuages, obstacles, pollution lumineuse et éclat. Les directions sont des points cardinaux (N, E, S, O).');

    box.replaceChildren(headline, el('div', { class: 'table-responsive' }, table), meta);
}

function computeAndRender() {
    const info = predictor.getTleInfo();
    const box = document.getElementById('iss-passes');
    if (!info.record || !window.satellite) {
        if (box && info.status === 'unavailable') box.textContent = `Calcul impossible : orbite indisponible (${info.reason}).`;
        return false;
    }
    try {
        lastResult = computePasses(window.satellite, info.record, observer, { hours: 72 });
        window.issPassSummary = lastResult; // structured, dated result for automation
        renderPasses(lastResult);
        return true;
    } catch (e) {
        console.error('[iss-passes] computation failed', e);
        if (box) box.textContent = `Calcul impossible : ${e.message}`;
        return false;
    }
}

function setObserver(lat, lon, label) {
    observer = { lat, lon, label };
    window.clientLat = lat;
    window.clientLon = lon;
    predictor.setTargetLatLon(lat, lon);
    const msg = document.getElementById('default-location-msg');
    if (msg) msg.style.display = 'none';
    computeAndRender();
}

function wireLocationButton() {
    const btn = document.getElementById('iss-use-my-location');
    if (!btn) return;
    if (!('geolocation' in navigator)) { btn.disabled = true; btn.title = 'Géolocalisation non disponible'; return; }
    btn.addEventListener('click', () => {
        btn.disabled = true;
        btn.textContent = 'Localisation…';
        navigator.geolocation.getCurrentPosition((pos) => {
            // Rounded to about 1 km; kept in this page only.
            const lat = Math.round(pos.coords.latitude * 100) / 100;
            const lon = Math.round(pos.coords.longitude * 100) / 100;
            setObserver(lat, lon, `votre position (arrondie à 0,01°, gardée dans ce navigateur)`);
            btn.textContent = 'Position utilisée';
        }, (err) => {
            btn.disabled = false;
            btn.textContent = 'Utiliser ma position';
            const msg = document.getElementById('default-location-msg');
            if (msg) { msg.style.display = 'block'; msg.textContent = `Position refusée ou indisponible (${err.message}) : calcul pour Québec.`; }
        }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 });
    });
}

export function initIssPanels() {
    window.clientLat = observer.lat;
    window.clientLon = observer.lon;
    wireLocationButton();
    renderStatus();
    setInterval(renderStatus, 5000);
    window.addEventListener('iss-data-status', renderStatus);

    // Wait for the TLE loaded by the predictor, then refresh periodically.
    let tries = 0;
    const waitTle = setInterval(() => {
        tries++;
        if (computeAndRender() || tries > 120) clearInterval(waitTle);
        renderStatus();
    }, 1000);
    setInterval(computeAndRender, RECOMPUTE_MS);

    if (location.hash === '#passages') {
        const target = document.getElementById('passages');
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
    }
}
