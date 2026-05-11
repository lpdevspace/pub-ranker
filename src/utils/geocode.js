/**
 * geocode.js — Nominatim (OpenStreetMap) geocoder
 * Free, no API key required. Rate limit: 1 req/sec.
 * Stores results in a module-level cache to avoid duplicate calls.
 */

const cache = {};

/**
 * Given a pub name + location string, returns { lat, lng } or null.
 * Example: geocodePub('The All Nations Inn', 'Madeley')
 */
export async function geocodePub(name, location) {
    const query = [name, location].filter(Boolean).join(', ');
    if (!query.trim()) return null;
    if (cache[query]) return cache[query];

    try {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            limit: '1',
            countrycodes: 'gb',
        });
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'PubRankerApp/1.0' } }
        );
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.length) return null;
        const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        cache[query] = result;
        return result;
    } catch {
        return null;
    }
}

/**
 * Geocode a batch of pubs that are missing lat/lng.
 * Respects the 1 req/sec Nominatim rate limit.
 * Calls onProgress(done, total) after each successful geocode.
 * Returns array of { id, lat, lng } for pubs that were resolved.
 */
export async function geocodeMissingPubs(pubsArray, onProgress) {
    const missing = pubsArray.filter(p => !p.lat || !p.lng);
    const results = [];
    for (let i = 0; i < missing.length; i++) {
        const pub = missing[i];
        const coords = await geocodePub(pub.name, pub.location);
        if (coords) results.push({ id: pub.id, ...coords });
        if (onProgress) onProgress(i + 1, missing.length);
        // respect Nominatim rate limit: 1 req/sec
        if (i < missing.length - 1) await new Promise(r => setTimeout(r, 1100));
    }
    return results;
}
