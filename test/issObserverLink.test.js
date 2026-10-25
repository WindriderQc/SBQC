const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

describe('ISS observer link', function () {
    let parse, consume;
    before(async function () {
        const source = await fs.readFile(path.join(__dirname, '../public/js/issObserverLink.js'), 'utf8');
        const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
        parse = mod.observerFromHash; consume = mod.consumeObserverLink;
    });
    it('accepts paired rounded coordinates including zero and the boundaries', function () {
        for (const pair of ['0.00,0.00', '-90.00,180.00', '12.34,-56.78']) {
            const result = parse('#passages?observer=v1:' + pair);
            assert.equal(result.status, 'valid');
            assert.deepEqual([result.lat, result.lon], pair.split(',').map(Number));
        }
    });
    it('refuses missing, duplicate, nondecimal, out-of-range and unsupported values', function () {
        for (const value of ['v1:,0', 'v1:null,0', 'v1:91,0', 'v1:0,-181', 'v2:0,0', 'v1:1.234,2', 'v1:0x1,0', 'v1:0,0&observer=v1:1,1']) {
            assert.equal(parse('#passages?observer=' + value).status, 'invalid');
        }
        assert.equal(parse('#passages').status, 'absent');
    });
    it('consumes valid and invalid handoffs without persistence or network calls', function () {
        for (const hash of ['#passages?observer=v1:12.34,-56.78', '#passages?observer=bad']) {
            const calls = [];
            const browser = { location: { hash, pathname: '/iss-detector', search: '' },
                history: { state: { keep: true }, replaceState(...args) { calls.push(args); } } };
            consume(browser);
            assert.deepEqual(calls, [[{ keep: true }, '', '/iss-detector#passages']]);
        }
    });
});
