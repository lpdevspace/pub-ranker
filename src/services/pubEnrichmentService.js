/**
 * pubEnrichmentService.js
 * 
 * Provides live OpenStreetMap (Overpass API) and Google Places enrichment for UK pubs:
 * - Live opening hours parsing & status ("Open Now · Closes 11:00 PM")
 * - Popular times & busy graph generation for all 7 days with live crowd overrides
 * - Street View interactive previews, 360 panoramas, and heading controls
 * - Overpass API query engine for phone, website, operator, amenities & real ale
 * - Google Places integration for live place details, high-res photos, and ratings
 */

// In-memory cache for Overpass & Google Places results
const enrichmentCache = new Map();

// Overpass API interpreter endpoints for reliable fallback
const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
];

/**
 * Standard British pub schedule fallback
 */
export const DEFAULT_PUB_SCHEDULE = {
    Monday:    { open: '12:00', close: '23:00', isOpenDay: true },
    Tuesday:   { open: '12:00', close: '23:00', isOpenDay: true },
    Wednesday: { open: '12:00', close: '23:00', isOpenDay: true },
    Thursday:  { open: '12:00', close: '23:00', isOpenDay: true },
    Friday:    { open: '12:00', close: '00:00', isOpenDay: true },
    Saturday:  { open: '12:00', close: '00:00', isOpenDay: true },
    Sunday:    { open: '12:00', close: '22:30', isOpenDay: true },
};

/**
 * Parses raw opening hours from OSM string OR Google Places weekdayDescriptions array
 * into a structured 7-day schedule map.
 */
export function parseOpeningHours(input) {
    const schedule = { ...DEFAULT_PUB_SCHEDULE };
    if (!input) return schedule;

    // Handle Google Places weekdayDescriptions array:
    // e.g. ["Monday: 12:00 PM – 11:00 PM", "Tuesday: 12:00 PM – 11:00 PM", ...]
    if (Array.isArray(input)) {
        for (const item of input) {
            if (typeof item !== 'string') continue;
            const parts = item.split(':');
            if (parts.length >= 2) {
                const dayName = parts[0].trim();
                const timePart = parts.slice(1).join(':').trim();
                if (schedule[dayName]) {
                    if (timePart.toLowerCase().includes('closed')) {
                        schedule[dayName] = { open: '00:00', close: '00:00', isOpenDay: false };
                    } else {
                        const parsedTimes = parse12hTimeRange(timePart);
                        if (parsedTimes) {
                            schedule[dayName] = { ...parsedTimes, isOpenDay: true };
                        }
                    }
                }
            }
        }
        return schedule;
    }

    // Handle string format (OSM format)
    if (typeof input === 'string') {
        const segments = input.split(';').map(s => s.trim()).filter(Boolean);
        for (const segment of segments) {
            // Match day range and 24h times e.g. "Mo-Th 12:00-23:00" or "Su 12:00-22:30"
            const match = segment.match(/([A-Za-z,-]+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
            if (match) {
                const [, dayPart, openTime, closeTime] = match;
                const targetDays = resolveDays(dayPart);
                for (const d of targetDays) {
                    schedule[d] = { open: openTime, close: closeTime, isOpenDay: true };
                }
            } else if (segment.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/)) {
                // All days
                const m = segment.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
                for (const d of Object.keys(schedule)) {
                    schedule[d] = { open: m[1], close: m[2], isOpenDay: true };
                }
            }
        }
        return schedule;
    }

    if (typeof input === 'object') {
        return { ...DEFAULT_PUB_SCHEDULE, ...input };
    }

    return schedule;
}

function parse12hTimeRange(timeStr) {
    // e.g. "12:00 PM – 11:00 PM" or "12:00 – 23:00"
    const cleaned = timeStr.replace(/[–—]/g, '-').trim();
    const parts = cleaned.split('-');
    if (parts.length !== 2) return null;

    const convertTo24h = (str) => {
        const s = str.trim().toUpperCase();
        const isPM = s.includes('PM');
        const isAM = s.includes('AM');
        const cleanDigits = s.replace(/[^0-9:]/g, '');
        let [h, m = '00'] = cleanDigits.split(':').map(Number);
        if (isNaN(h)) return '12:00';
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    return {
        open: convertTo24h(parts[0]),
        close: convertTo24h(parts[1]),
    };
}

function resolveDays(dayPart) {
    const map = {
        Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday',
        Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday'
    };
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    if (dayPart.includes('-')) {
        const [start, end] = dayPart.split('-');
        const sIdx = days.indexOf(start.trim());
        const eIdx = days.indexOf(end.trim());
        if (sIdx !== -1 && eIdx !== -1) {
            const result = [];
            for (let i = sIdx; i <= (eIdx >= sIdx ? eIdx : eIdx + 7); i++) {
                result.push(map[days[i % 7]]);
            }
            return result;
        }
    }
    return dayPart.split(',').map(s => map[s.trim()]).filter(Boolean);
}

/**
 * Format a 24h string ("14:30") to friendly 12h display ("2:30 pm" or "11 pm")
 */
export function formatTime12h(timeStr) {
    if (!timeStr) return '';
    let [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m === 0 || isNaN(m) ? '' : `:${m < 10 ? '0' : ''}${m}`;
    return `${displayH}${displayM} ${ampm}`;
}

/**
 * Computes live opening status right now for a pub's schedule.
 */
export function getLiveOpeningStatus(openingHoursInput) {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const currentDay = days[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const schedule = parseOpeningHours(openingHoursInput);
    const todayHours = schedule[currentDay] || { open: '12:00', close: '23:00', isOpenDay: true };

    if (!todayHours.isOpenDay) {
        return {
            isOpen: false,
            isClosingSoon: false,
            statusText: 'Closed Today',
            badgeType: 'closed',
            currentDay,
            todayHours,
            schedule,
            formattedOpen: '',
            formattedClose: '',
        };
    }

    const [openH, openM] = (todayHours.open || '12:00').split(':').map(Number);
    let [closeH, closeM] = (todayHours.close || '23:00').split(':').map(Number);
    if (closeH === 0) closeH = 24; // midnight handling

    const openMinutes = openH * 60 + (openM || 0);
    const closeMinutes = closeH * 60 + (closeM || 0);

    const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    const minutesUntilClose = closeMinutes - currentMinutes;
    const isClosingSoon = isOpen && minutesUntilClose <= 45 && minutesUntilClose > 0;

    let statusText = '';
    let badgeType = 'closed'; // 'open' | 'closing-soon' | 'closed'

    if (isOpen) {
        if (isClosingSoon) {
            statusText = `Closing soon · ${formatTime12h(todayHours.close)}`;
            badgeType = 'closing-soon';
        } else {
            statusText = `Open Now · Closes ${formatTime12h(todayHours.close)}`;
            badgeType = 'open';
        }
    } else {
        badgeType = 'closed';
        if (currentMinutes < openMinutes) {
            statusText = `Closed · Opens ${formatTime12h(todayHours.open)}`;
        } else {
            const nextDayIndex = (now.getDay() + 1) % 7;
            const nextDay = days[nextDayIndex];
            const nextDayHours = schedule[nextDay] || { open: '12:00', isOpenDay: true };
            statusText = nextDayHours.isOpenDay
                ? `Closed · Opens tomorrow ${formatTime12h(nextDayHours.open)}`
                : 'Closed for the night';
        }
    }

    return {
        isOpen,
        isClosingSoon,
        statusText,
        badgeType,
        todayHours,
        currentDay,
        schedule,
        formattedClose: formatTime12h(todayHours.close),
        formattedOpen: formatTime12h(todayHours.open),
    };
}

/**
 * Returns full hourly busy curve for a specified day of week (0=Sunday to 6=Saturday)
 * with live user status overrides.
 */
export function getPopularTimesForDay(targetDayIndex = null, liveBusyStatus = null) {
    const now = new Date();
    const day = targetDayIndex !== null ? targetDayIndex : now.getDay();
    const isCurrentDay = day === now.getDay();
    const currentHour = now.getHours();

    // Standard UK pub traffic curve (11am to 11pm: 13 hourly points)
    // [11am, 12pm, 1pm, 2pm, 3pm, 4pm, 5pm, 6pm, 7pm, 8pm, 9pm, 10pm, 11pm]
    let baseCurve = [15, 25, 35, 30, 20, 25, 55, 75, 85, 90, 80, 65, 30];

    if (day === 5) {
        // Friday: Massive after-work rush + late night
        baseCurve = [12, 28, 40, 35, 35, 55, 78, 92, 98, 96, 92, 78, 42];
    } else if (day === 6) {
        // Saturday: Afternoon drinking into packed evening
        baseCurve = [18, 35, 55, 60, 58, 65, 78, 90, 95, 94, 88, 72, 40];
    } else if (day === 0) {
        // Sunday: Roast Peak (12pm-3pm), mellow evening
        baseCurve = [20, 55, 88, 92, 80, 55, 45, 50, 58, 48, 32, 20, 10];
    } else if (day === 4) {
        // Thursday: "Little Friday" lively after-work
        baseCurve = [15, 28, 38, 32, 25, 35, 65, 82, 88, 90, 82, 60, 25];
    }

    // Apply live crowd override if viewing current day & hour
    let liveMultiplier = 1.0;
    if (liveBusyStatus === 'quiet') liveMultiplier = 0.55;
    if (liveBusyStatus === 'packed') liveMultiplier = 1.25;

    const hours = [];
    let peakScore = 0;
    let peakLabel = '';

    for (let h = 11; h <= 23; h++) {
        const idx = h - 11;
        const isCurrent = isCurrentDay && h === currentHour;
        let busyScore = Math.min(100, Math.round(baseCurve[idx] * (isCurrent ? liveMultiplier : 1.0)));
        const displayLabel = h === 12 ? '12pm' : h > 12 ? `${h - 12}pm` : `${h}am`;

        if (busyScore > peakScore) {
            peakScore = busyScore;
            peakLabel = `${displayLabel} (${peakScore}%)`;
        }

        let level = 'low';
        if (busyScore >= 80) level = 'peak';
        else if (busyScore >= 65) level = 'high';
        else if (busyScore >= 40) level = 'moderate';

        hours.push({
            hour: h,
            displayLabel,
            busyScore,
            isCurrent,
            level
        });
    }

    const currentHourData = hours.find(h => h.isCurrent) || { busyScore: baseCurve[Math.max(0, Math.min(12, currentHour - 11))] || 30 };
    
    let summaryText = 'Usually not very busy';
    if (currentHourData.busyScore >= 80) summaryText = 'Usually very busy (Peak atmosphere)';
    else if (currentHourData.busyScore >= 60) summaryText = 'Lively crowd & atmosphere';
    else if (currentHourData.busyScore >= 40) summaryText = 'Moderately busy';

    return {
        hours,
        currentHour,
        currentBusyScore: currentHourData.busyScore,
        peakLabel,
        summaryText,
        isCurrentDay
    };
}

/**
 * Convenience helper for getting popular times for today
 */
export function getPopularTimesForToday(liveBusyStatus = null) {
    return getPopularTimesForDay(null, liveBusyStatus);
}

/**
 * Returns Google Street View interactive embed and preview data.
 */
export function getStreetViewData(lat, lng, heading = 180) {
    if (!lat || !lng) return null;

    // Google Maps 360° interactive Street View link
    const webPanoUrl = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}&heading=${heading}&pitch=0&fov=85`;

    // Google Maps Street View iframe embed URL
    const embedUrl = `https://maps.google.com/maps?q=&layer=c&cbll=${lat},${lng}&cbp=11,${heading},0,0,0&output=svembed`;

    // Google Static Street View thumbnail URL
    const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDCt89zX7erSmKDeuC-wutMMGrju48KO-Q';
    const previewImageUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x360&location=${lat},${lng}&fov=85&heading=${heading}&pitch=0&key=${googleApiKey}`;

    return {
        lat,
        lng,
        heading,
        webPanoUrl,
        embedUrl,
        previewImageUrl
    };
}

/**
 * Queries OpenStreetMap Overpass API for pub opening hours and amenities.
 */
export async function enrichPubWithOSM(pub) {
    const lat = pub.lat;
    const lng = pub.lng;
    const name = pub.name;

    if (!lat || !lng) return null;

    const cacheKey = `osm_${lat.toFixed(4)}_${lng.toFixed(4)}`;
    if (enrichmentCache.has(cacheKey)) {
        return enrichmentCache.get(cacheKey);
    }

    const query = `
        [out:json][timeout:10];
        (
          nwr["amenity"="pub"](around:1000,${lat},${lng});
          nwr["amenity"="bar"](around:1000,${lat},${lng});
        );
        out tags center 15;
    `.trim();

    // Iterate through endpoint mirrors for reliability
    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (!resp.ok) continue;
            const data = await resp.json();

            if (!data.elements || data.elements.length === 0) continue;

            // Match closest element by name
            const cleanName = (name || '').toLowerCase().replace(/^(the|ye olde)\s+/i, '').trim();
            const matched = data.elements.find(el => {
                const elName = (el.tags?.name || '').toLowerCase();
                return elName.includes(cleanName) || cleanName.includes(elName);
            }) || data.elements[0];

            const tags = matched.tags || {};

            const result = {
                source: 'osm',
                osmId: matched.id,
                osmName: tags.name,
                openingHours: tags.opening_hours || null,
                phone: tags.phone || tags['contact:phone'] || null,
                website: tags.website || tags['contact:website'] || null,
                operator: tags.operator || tags.brand || null,
                wheelchair: tags.wheelchair === 'yes',
                hasBeerGarden: tags.outdoor_seating === 'yes' || tags.garden === 'yes' || tags['beer_garden'] === 'yes',
                servesFood: tags.food === 'yes' || !!tags.cuisine,
                realAle: tags.real_ale === 'yes',
                hasSportsTv: tags.sport === 'yes' || tags['screen'] === 'yes',
                addressStreet: [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ') || null,
                postcode: tags['addr:postcode'] || null,
                enrichedAt: Date.now(),
            };

            enrichmentCache.set(cacheKey, result);
            return result;
        } catch (e) {
            // Try next mirror
            console.warn(`Overpass endpoint ${endpoint} failed:`, e.message);
        }
    }

    return null;
}

/**
 * Queries Google Places JavaScript library (if available in window.google).
 */
export async function enrichPubWithGooglePlaces(pub) {
    if (!window.google?.maps?.importLibrary) return null;

    const cacheKey = `gplaces_${pub.id || pub.name}`;
    if (enrichmentCache.has(cacheKey)) {
        return enrichmentCache.get(cacheKey);
    }

    try {
        const { Place } = await window.google.maps.importLibrary('places');
        const searchQuery = pub.location ? `${pub.name} in ${pub.location}` : pub.name;

        let placeData = null;

        if (pub.placeId) {
            try {
                const place = new Place({ id: pub.placeId });
                await place.fetchFields({
                    fields: [
                        'id', 'displayName', 'formattedAddress', 'location',
                        'rating', 'userRatingCount', 'regularOpeningHours',
                        'currentOpeningHours', 'photos', 'websiteURI', 'nationalPhoneNumber'
                    ]
                });
                placeData = place;
            } catch (err) {
                console.warn('Google Place fetchFields failed, falling back to search:', err);
            }
        }

        if (!placeData) {
            const { places } = await Place.searchByText({
                textQuery: searchQuery,
                fields: [
                    'id', 'displayName', 'formattedAddress', 'location',
                    'rating', 'userRatingCount', 'regularOpeningHours',
                    'currentOpeningHours', 'photos', 'websiteURI', 'nationalPhoneNumber'
                ]
            });
            if (places && places.length > 0) {
                placeData = places[0];
            }
        }

        if (!placeData) return null;

        let photoURL = null;
        if (placeData.photos?.length > 0) {
            photoURL = placeData.photos[0].getURI({ maxWidth: 1000 });
        }

        const weekdayDescriptions = placeData.regularOpeningHours?.weekdayDescriptions || null;

        const result = {
            source: 'google',
            placeId: placeData.id,
            googleRating: placeData.rating || null,
            googleRatingCount: placeData.userRatingCount || null,
            formattedAddress: placeData.formattedAddress || null,
            openingHours: weekdayDescriptions || null,
            phone: placeData.nationalPhoneNumber || null,
            website: placeData.websiteURI || null,
            photoURL: photoURL || null,
            lat: placeData.location ? placeData.location.lat() : null,
            lng: placeData.location ? placeData.location.lng() : null,
            enrichedAt: Date.now(),
        };

        enrichmentCache.set(cacheKey, result);
        return result;
    } catch (err) {
        console.warn('Google Places enrichment failed:', err);
        return null;
    }
}

/**
 * Master enrichment function combining Google Places and Overpass OSM.
 */
export async function enrichPubData(pub) {
    if (!pub) return null;

    let googleData = null;
    let osmData = null;

    // Run both queries in parallel for maximum speed
    const [gRes, osmRes] = await Promise.allSettled([
        enrichPubWithGooglePlaces(pub),
        enrichPubWithOSM(pub),
    ]);

    if (gRes.status === 'fulfilled' && gRes.value) {
        googleData = gRes.value;
    }
    if (osmRes.status === 'fulfilled' && osmRes.value) {
        osmData = osmRes.value;
    }

    const lat = pub.lat || googleData?.lat || null;
    const lng = pub.lng || googleData?.lng || null;
    const streetView = getStreetViewData(lat, lng);

    // Merge opening hours: Google has verified current descriptions, OSM provides 24h schedule
    const openingHours = googleData?.openingHours || osmData?.openingHours || pub.openingHours || null;
    const parsedSchedule = parseOpeningHours(openingHours);

    // Merge amenities
    const existingAmenities = pub.amenities || {};
    const mergedAmenities = {
        ...existingAmenities,
        ...(osmData?.wheelchair !== undefined && { wheelchairAccessible: osmData.wheelchair }),
        ...(osmData?.hasBeerGarden !== undefined && { hasBeerGarden: osmData.hasBeerGarden }),
        ...(osmData?.servesFood !== undefined && { servesFood: osmData.servesFood }),
        ...(osmData?.realAle !== undefined && { realAle: osmData.realAle }),
        ...(osmData?.hasSportsTv !== undefined && { hasSportsTv: osmData.hasSportsTv }),
    };

    return {
        placeId: googleData?.placeId || pub.placeId || null,
        googleRating: googleData?.googleRating || pub.googleRating || null,
        googleRatingCount: googleData?.googleRatingCount || pub.googleRatingCount || null,
        formattedAddress: googleData?.formattedAddress || osmData?.addressStreet || pub.address || pub.location || null,
        photoURL: pub.photoURL || googleData?.photoURL || null,
        phone: googleData?.phone || osmData?.phone || pub.phone || null,
        website: googleData?.website || osmData?.website || pub.website || null,
        operator: osmData?.operator || pub.operator || null,
        openingHours,
        schedule: parsedSchedule,
        amenities: mergedAmenities,
        streetView,
        lastEnrichedAt: Date.now(),
        enrichmentSource: googleData && osmData ? 'Google Places + OpenStreetMap' : googleData ? 'Google Places' : osmData ? 'OpenStreetMap' : 'Default',
    };
}

/**
 * Batch enriches a list of pubs sequentially with rate-limit delays.
 */
export async function batchEnrichPubs(pubs, pubsRef, onProgress) {
    if (!Array.isArray(pubs) || pubs.length === 0) return { success: 0, total: 0 };

    let successCount = 0;
    const total = pubs.length;

    for (let i = 0; i < total; i++) {
        const pub = pubs[i];
        if (onProgress) {
            onProgress({ current: i + 1, total, pubName: pub.name });
        }

        try {
            const enriched = await enrichPubData(pub);
            if (enriched && pubsRef && pub.id) {
                const updates = {};
                if (enriched.openingHours) updates.openingHours = enriched.openingHours;
                if (enriched.schedule) updates.schedule = enriched.schedule;
                if (enriched.phone && !pub.phone) updates.phone = enriched.phone;
                if (enriched.website && !pub.website) updates.website = enriched.website;
                if (enriched.placeId && !pub.placeId) updates.placeId = enriched.placeId;
                if (enriched.googleRating && !pub.googleRating) updates.googleRating = enriched.googleRating;
                if (enriched.photoURL && !pub.photoURL) updates.photoURL = enriched.photoURL;
                if (enriched.amenities) updates.amenities = enriched.amenities;
                if (enriched.lastEnrichedAt) updates.lastEnrichedAt = enriched.lastEnrichedAt;
                if (enriched.enrichmentSource) updates.enrichmentSource = enriched.enrichmentSource;

                if (Object.keys(updates).length > 0) {
                    await pubsRef.doc(pub.id).update(updates);
                    successCount++;
                }
            }
        } catch (err) {
            console.error(`Failed to enrich pub ${pub.name}:`, err);
        }

        // Polite delay between requests
        await new Promise(r => setTimeout(r, 600));
    }

    return { success: successCount, total };
}
