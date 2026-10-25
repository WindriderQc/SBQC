// Optional browser-only handoff. Never send or persist the supplied location.
export function observerFromHash(hash) {
    if (!hash.startsWith('#passages?')) return { status: 'absent' };
    const params = new URLSearchParams(hash.slice('#passages?'.length));
    if (!params.has('observer')) return { status: 'absent' };
    const values = params.getAll('observer');
    const match = values.length === 1 && /^v1:(-?\d{1,2}(?:\.\d{1,2})?),(-?\d{1,3}(?:\.\d{1,2})?)$/.exec(values[0]);
    if (!match) return { status: 'invalid' };
    const lat = Number(match[1]), lon = Number(match[2]);
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return { status: 'invalid' };
    return { status: 'valid', lat, lon, label: 'lieu fourni par le lien (arrondi à 0,01°)' };
}

export function consumeObserverLink(browser = window) {
    const result = observerFromHash(browser.location.hash);
    if (result.status !== 'absent') {
        // Drop the coordinates before further rendering, links or navigation.
        browser.history.replaceState(browser.history.state, '',
            browser.location.pathname + browser.location.search + '#passages');
    }
    return result;
}
