const { expect } = require('chai');
const express = require('express');
const request = require('supertest');
const path = require('path');
const { pathToFileURL } = require('url');
const satellite = require('satellite.js');

const iss = require('../services/issDataService');

// CelesTrak ISS element set fetched 2026-10-24; reference passes below were
// computed independently with PyEphem 4.2.1 for 46.8139 N, 71.2080 W.
const TLE = [
    'ISS (ZARYA)',
    '1 25544U 98067A   26297.20915682  .00007800  00000+0  14938-3 0  9991',
    '2 25544  51.6335  21.6229 0006884 302.9098  57.1228 15.49030149591752',
].join('\n');

function textResponse(body, status = 200) {
    return { ok: status >= 200 && status < 300, status, text: async () => body, json: async () => JSON.parse(body) };
}

describe('ISS data service', function () {
    const savedEnv = { ...process.env };
    afterEach(function () {
        iss.setFetchForTests(null);
        process.env = { ...savedEnv };
    });

    it('parses the TLE epoch in UTC', function () {
        const rec = iss.parseIssTle(TLE);
        expect(rec.name).to.equal('ISS (ZARYA)');
        expect(new Date(rec.epochMs).toISOString()).to.equal('2026-10-24T05:01:11.149Z');
    });

    it('rejects a CelesTrak answer without the ISS element set', function () {
        expect(() => iss.parseIssTle('No GP data found')).to.throw(/25544/);
    });

    it('fetches the ISS element set from celestrak.org and caches it', async function () {
        const calls = [];
        iss.setFetchForTests(async (url) => { calls.push(url); return textResponse(TLE); });
        const now = Date.parse('2026-10-24T22:00:00Z');
        const first = await iss.getIssTle({ nowMs: now });
        const second = await iss.getIssTle({ nowMs: now + 60 * 1000 });
        expect(calls).to.deep.equal([iss.DEFAULT_TLE_URL]);
        expect(iss.DEFAULT_TLE_URL).to.match(/^https:\/\/celestrak\.org\/.*CATNR=25544/);
        expect(first.source).to.equal('celestrak.org');
        expect(first.stale).to.equal(false);
        expect(second.fetchedAtMs).to.equal(now);
    });

    it('serves the previous element set marked stale when a refresh fails, and backs off', async function () {
        let calls = 0;
        let fail = false;
        iss.setFetchForTests(async () => { calls++; if (fail) throw new Error('connect timeout'); return textResponse(TLE); });
        const now = Date.parse('2026-10-24T22:00:00Z');
        await iss.getIssTle({ nowMs: now });
        fail = true;
        const later = now + 3 * 3600 * 1000;
        const stale = await iss.getIssTle({ nowMs: later });
        expect(stale.stale).to.equal(true);
        expect(stale.refreshFailed).to.equal(true);
        await iss.getIssTle({ nowMs: later + 60 * 1000 });
        expect(calls).to.equal(2); // no new request inside the back-off window
    });

    it('reports the TLE as unavailable when nothing was ever fetched', async function () {
        iss.setFetchForTests(async () => textResponse('No GP data found'));
        try {
            await iss.getIssTle();
            expect.fail('should throw');
        } catch (err) {
            expect(err).to.be.instanceOf(iss.IssDataUnavailable);
            expect(err.reason).to.match(/25544/);
        }
    });

    it('refuses to call DataAPI without its key and says why', async function () {
        process.env.DATA_API_URL = 'https://data.example.test';
        delete process.env.DATAAPI_API_KEY;
        iss.setFetchForTests(async () => { throw new Error('must not be called'); });
        try {
            await iss.getIssHistory();
            expect.fail('should throw');
        } catch (err) {
            expect(err).to.be.instanceOf(iss.IssDataUnavailable);
            expect(err.reason).to.match(/DATAAPI_API_KEY/);
        }
    });

    it('sends the DataAPI key and returns history freshness', async function () {
        process.env.DATA_API_URL = 'https://data.example.test';
        process.env.DATAAPI_API_KEY = 'test-key';
        let seen;
        iss.setFetchForTests(async (url, opts) => {
            seen = { url, key: opts.headers['x-api-key'] };
            return textResponse(JSON.stringify({ status: 'success', meta: { total: 2 }, data: [
                { latitude: 1, longitude: 2, timeStamp: '2026-10-24T21:59:00Z' },
                { latitude: 3, longitude: 4, timeStamp: '2026-10-24T21:59:10Z' },
            ] }));
        });
        const out = await iss.getIssHistory({ nowMs: Date.parse('2026-10-24T22:00:00Z') });
        expect(seen).to.deep.equal({ url: 'https://data.example.test/api/v1/iss', key: 'test-key' });
        expect(out.meta.latest).to.equal('2026-10-24T21:59:10.000Z');
        expect(out.meta.latestAgeSec).to.equal(50);
        expect(out.data).to.have.length(2);
    });

    it('maps a DataAPI 401 to an explicit unavailable reason', async function () {
        process.env.DATA_API_URL = 'https://data.example.test';
        process.env.DATAAPI_API_KEY = 'wrong';
        iss.setFetchForTests(async () => textResponse('{"status":"error","message":"Unauthorized"}', 401));
        try {
            await iss.getIssHistory();
            expect.fail('should throw');
        } catch (err) {
            expect(err.reason).to.match(/401/);
        }
    });
});

describe('ISS API routes', function () {
    let app;
    before(function () {
        app = express();
        app.use('/api', require('../routes/api.routes'));
    });
    afterEach(function () { iss.setFetchForTests(null); });

    it('GET /api/tle keeps the text contract and adds freshness headers', async function () {
        iss.setFetchForTests(async () => textResponse(TLE));
        const res = await request(app).get('/api/tle');
        expect(res.status).to.equal(200);
        expect(res.headers['content-type']).to.match(/text\/plain/);
        expect(res.text.split('\n')[1]).to.match(/^1 25544U/);
        expect(res.headers['x-tle-epoch']).to.equal('2026-10-24T05:01:11.149Z');
    });

    it('GET /api/tle?format=json returns the dated record', async function () {
        iss.setFetchForTests(async () => textResponse(TLE));
        const res = await request(app).get('/api/tle?format=json');
        expect(res.status).to.equal(200);
        expect(res.body).to.include({ status: 'success', source: 'celestrak.org', epoch: '2026-10-24T05:01:11.149Z' });
    });

    it('GET /api/tle answers 503 with a reason instead of 500', async function () {
        iss.setFetchForTests(async () => { throw new Error('connect timeout'); });
        const res = await request(app).get('/api/tle');
        expect(res.status).to.equal(503);
        expect(res.body).to.include({ status: 'unavailable', reason: 'connect timeout' });
    });

    it('GET /api/iss answers 503 with a reason when the key is missing', async function () {
        const saved = process.env.DATAAPI_API_KEY;
        delete process.env.DATAAPI_API_KEY;
        process.env.DATA_API_URL = process.env.DATA_API_URL || 'https://data.example.test';
        const res = await request(app).get('/api/iss');
        if (saved !== undefined) process.env.DATAAPI_API_KEY = saved;
        expect(res.status).to.equal(503);
        expect(res.body.reason).to.match(/DATAAPI_API_KEY/);
    });
});

describe('ISS passes (browser module)', function () {
    let computePasses, directionFr;
    before(async function () {
        ({ computePasses, directionFr } = await import(pathToFileURL(path.join(__dirname, '../public/js/issPasses.js')).href));
    });

    const [, line1, line2] = TLE.split('\n');
    const quebec = { lat: 46.8139, lon: -71.2080 };

    function run() {
        return computePasses(satellite, { line1, line2 }, quebec, { start: new Date('2026-10-24T22:30:00Z'), hours: 40 });
    }

    function near(iso, expectedIso, toleranceSec) {
        expect(Math.abs(Date.parse(iso) - Date.parse(expectedIso)) / 1000).to.be.at.most(toleranceSec, `${iso} vs ${expectedIso}`);
    }

    it('matches PyEphem rise, culmination and set times', function () {
        const reference = [
            ['2026-10-25T05:57:04Z', '2026-10-25T06:02:07Z', 22.3, '2026-10-25T06:07:12Z'],
            ['2026-10-25T07:33:11Z', '2026-10-25T07:38:40Z', 72.7, '2026-10-25T07:44:10Z'],
            ['2026-10-25T09:10:26Z', '2026-10-25T09:15:49Z', 34.9, '2026-10-25T09:21:12Z'],
            ['2026-10-25T10:47:36Z', '2026-10-25T10:53:04Z', 49.4, '2026-10-25T10:58:31Z'],
        ];
        const passes = run().passes.filter(p => p.max.elDeg > 1);
        reference.forEach(([rise, max, el, set], i) => {
            near(passes[i].rise.time, rise, 3);
            near(passes[i].max.time, max, 3);
            near(passes[i].set.time, set, 3);
            expect(Math.abs(passes[i].max.elDeg - el)).to.be.at.most(0.3);
        });
    });

    it('separates geometric passes from observable ones', function () {
        const byRise = Object.fromEntries(run().passes.map(p => [p.rise.time.slice(0, 16), p]));
        // In Earth's shadow the whole time (PyEphem: eclipsed at culmination, Sun -50°).
        expect(byRise['2026-10-25T05:57'].observable).to.equal(false);
        expect(byRise['2026-10-25T05:57'].reasons[0].code).to.equal('earth_shadow');
        // Leaves the shadow at 09:16:00 per PyEphem, then visible until it drops under 10°.
        const visible = byRise['2026-10-25T09:10'];
        expect(visible.observable).to.equal(true);
        near(visible.visible.start.time, '2026-10-25T09:16:00Z', 12);
        expect(visible.visible.end.direction).to.equal('ENE');
        // Sunlit station but the Sun is only 4.8° below the horizon: sky too bright.
        expect(byRise['2026-10-25T10:47'].reasons[0].code).to.equal('daylight');
        // Culminates under 1°: geometric only.
        expect(byRise['2026-10-25T04:25'].reasons[0].code).to.equal('too_low');
    });

    it('names directions with French cardinal points', function () {
        expect(directionFr(0)).to.equal('N');
        expect(directionFr(270)).to.equal('O');
        expect(directionFr(225)).to.equal('SO');
        expect(directionFr(359)).to.equal('N');
    });
});
