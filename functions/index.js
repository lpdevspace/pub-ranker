/**
 * Cloud Functions (Node 18) — europe-west2
 *
 * Trigger 1 & 2: onGroupScoreCreate / onGlobalScoreCreate
 *   - Writes /rateLimits/{userId}  (rate-limit enforcement, Admin SDK bypass)
 *
 * Trigger 3: onGroupScoreCreateBadges
 *   - Triggered on new group score creation.
 *   - Re-computes badge state server-side using lightweight inline logic.
 *   - Diffs against /groups/{groupId}/userBadges/{userId}.earnedBadges.
 *   - Writes newly earned badges back with a server timestamp.
 *   - Appends a recentUnlock doc to /groups/{groupId}/recentUnlocks so the
 *     client feed can react in real time.
 *
 * Deploy:
 *   firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

// ── Badge definitions (server-side copy — keep in sync with badgeEngine.js) ──
// We only need the check logic and tier; we don't need React/JSX here.
const SERVER_BADGE_DEFINITIONS = [
    { id: 'first_pint',          tier: 'bronze',    check: s => s.pubsRated >= 1   },
    { id: 'local_regular',       tier: 'bronze',    check: s => s.pubsRated >= 10  },
    { id: 'pub_hopper',          tier: 'silver',    check: s => s.pubsRated >= 25  },
    { id: 'seasoned_crawler',    tier: 'silver',    check: s => s.pubsRated >= 50  },
    { id: 'century_club',        tier: 'gold',      check: s => s.pubsRated >= 100 },
    { id: 'legend_of_the_local', tier: 'legendary', check: s => s.pubsRated >= 200 },
    { id: 'generous_soul',       tier: 'bronze',    check: s => s.pubsRated >= 5  && s.personalAvg >= 8.0  },
    { id: 'tough_love',          tier: 'bronze',    check: s => s.pubsRated >= 5  && s.personalAvg <= 4.5  },
    { id: 'the_perfectionist',   tier: 'bronze',    check: s => s.perfectTens >= 1   },
    { id: 'the_harsh_truth',     tier: 'bronze',    check: s => s.worstOnes   >= 1   },
    { id: 'consistent_critic',   tier: 'silver',    check: s => s.maxRatingsInMonth >= 5 },
    { id: 'review_royalty',      tier: 'silver',    check: s => s.writtenReviews >= 10  },
    { id: 'first_addition',      tier: 'bronze',    check: s => s.pubsAdded >= 1  },
    { id: 'directory_builder',   tier: 'silver',    check: s => s.pubsAdded >= 10 },
    { id: 'top_of_the_pops',     tier: 'gold',      check: s => s.isTopRater      },
    { id: 'trendsetter',         tier: 'silver',    check: s => s.firstRatings >= 1 },
    { id: 'crawl_organiser',     tier: 'bronze',    check: s => s.crawlsCreated >= 1 },
    { id: 'hitlister',           tier: 'bronze',    check: s => s.hitListCount >= 5  },
    { id: 'all_rounder',         tier: 'silver',    check: s => s.hasFullCategoryRating },
    { id: 'dedicated_drinker',   tier: 'silver',    check: s => s.activeMonths >= 3  },
    // platinum_palate omitted server-side — requires gold check; handled in separate pass below
];

// Badge metadata for notification messages
const BADGE_META = {
    first_pint:          { name: 'First Pint',           emoji: '🍺' },
    local_regular:       { name: 'Local Regular',        emoji: '📍' },
    pub_hopper:          { name: 'Pub Hopper',           emoji: '🦘' },
    seasoned_crawler:    { name: 'Seasoned Crawler',     emoji: '🗺️' },
    century_club:        { name: 'Century Club',         emoji: '💯' },
    legend_of_the_local: { name: 'Legend of the Local',  emoji: '👑' },
    generous_soul:       { name: 'Generous Soul',        emoji: '😇' },
    tough_love:          { name: 'Tough Love',           emoji: '😤' },
    the_perfectionist:   { name: 'The Perfectionist',    emoji: '🎯' },
    the_harsh_truth:     { name: 'The Harsh Truth',      emoji: '💀' },
    consistent_critic:   { name: 'Consistent Critic',    emoji: '📝' },
    review_royalty:      { name: 'Review Royalty',       emoji: '✍️' },
    first_addition:      { name: 'First Addition',       emoji: '➕' },
    directory_builder:   { name: 'Directory Builder',    emoji: '🏗️' },
    top_of_the_pops:     { name: 'Top of the Pops',      emoji: '🎤' },
    trendsetter:         { name: 'Trendsetter',          emoji: '🌟' },
    crawl_organiser:     { name: 'Crawl Organiser',      emoji: '🗓️' },
    hitlister:           { name: 'The Hitlister',        emoji: '🎯' },
    all_rounder:         { name: 'All Rounder',          emoji: '🎪' },
    dedicated_drinker:   { name: 'Dedicated Drinker',   emoji: '📅' },
    platinum_palate:     { name: 'Platinum Palate',      emoji: '💎' },
};

// ── Helper: rate-limit doc write ─────────────────────────────────────────────
async function writeRateLimit(userId, context) {
    if (!userId) {
        console.warn('score trigger: no userId — skipping rate limit write.');
        return null;
    }
    await db.collection('rateLimits').doc(userId).set(
        {
            lastScoreAt: admin.firestore.FieldValue.serverTimestamp(),
            totalScores: admin.firestore.FieldValue.increment(1),
        },
        { merge: true }
    );
    console.log(`rateLimits/${userId} updated. path: ${context.resource.name}`);
    return null;
}

// ── Helper: compute lightweight server-side stats for a user ─────────────────
async function computeServerStats(userId, groupId) {
    const pubsRated    = new Set();
    const ratingTimes  = [];
    let perfectTens    = 0;
    let worstOnes      = 0;
    let writtenReviews = 0;
    let sumScores      = 0;
    let countScores    = 0;
    let firstRatings   = 0;
    const pubCritMap   = {}; // pubId -> Set of criteriaIds for this user

    // Fetch all group scores in one collection group query
    const scoresSnap = await db
        .collection('groups').doc(groupId)
        .collection('scores')
        .get();

    const allByPubCrit = {}; // pubId+critId -> array of {userId, value, type, createdAt}
    const userScoresByCrit = {}; // critId -> myScore

    scoresSnap.forEach(doc => {
        const d = doc.data();
        if (!d.pubId || !d.criteriaId) return;
        const key = `${d.pubId}__${d.criteriaId}`;
        if (!allByPubCrit[key]) allByPubCrit[key] = [];
        allByPubCrit[key].push(d);
        if (d.userId === userId) userScoresByCrit[key] = d;
    });

    Object.entries(userScoresByCrit).forEach(([key, myScore]) => {
        const [pubId] = key.split('__');
        if (myScore.type === 'scale' && myScore.value != null) {
            pubsRated.add(pubId);
            sumScores  += myScore.value;
            countScores++;
            if (myScore.value === 10) perfectTens++;
            if (myScore.value === 1)  worstOnes++;
            if (myScore.createdAt) ratingTimes.push(myScore.createdAt);

            if (!pubCritMap[pubId]) pubCritMap[pubId] = new Set();
            pubCritMap[pubId].add(myScore.criteriaId || key.split('__')[1]);

            // First rater on this pub+crit?
            const all = allByPubCrit[key].filter(s => s.type === 'scale' && s.createdAt);
            all.sort((a, b) => (a.createdAt.toMillis() - b.createdAt.toMillis()));
            if (all[0]?.userId === userId) firstRatings++;
        }
        if (myScore.type === 'text' && myScore.value?.toString().trim().length > 0) {
            writtenReviews++;
        }
    });

    const personalAvg = countScores > 0 ? sumScores / countScores : 0;

    const monthCounts = {};
    ratingTimes.forEach(ts => {
        const d   = ts.toDate();
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    const maxRatingsInMonth = Math.max(0, ...Object.values(monthCounts));
    const activeMonths      = Object.keys(monthCounts).length;

    // Pubs added
    const pubsSnap = await db.collectionGroup('pubs')
        .where('addedBy', '==', userId).get();
    const pubsAdded = pubsSnap.size;

    // Hit list
    const hitSnap = await db.collectionGroup('pubs')
        .where('toVisitBy', 'array-contains', userId).get();
    const hitListCount = hitSnap.size;

    // Criteria count
    const critSnap = await db
        .collection('groups').doc(groupId)
        .collection('criteria')
        .where('type', '==', 'scale').get();
    const totalCategories = critSnap.size;

    const maxCategoriesOnOnePub = Math.max(0, ...Object.values(pubCritMap).map(s => s.size));
    const hasFullCategoryRating = totalCategories > 0 && maxCategoriesOnOnePub >= totalCategories;

    // Top rater?
    const userCounts = {};
    scoresSnap.forEach(doc => {
        const d = doc.data();
        if (d.type === 'scale' && d.value != null && d.userId && d.pubId) {
            if (!userCounts[d.userId]) userCounts[d.userId] = new Set();
            userCounts[d.userId].add(d.pubId);
        }
    });
    const groupMaxRated = Math.max(0, ...Object.values(userCounts).map(s => s.size));
    const isTopRater    = pubsRated.size > 0 && pubsRated.size >= groupMaxRated;

    // Crawls
    const crawlsSnap = await db.collection('crawls')
        .where('groupId', '==', groupId)
        .where('createdBy', '==', userId).get();
    const crawlsCreated = crawlsSnap.size;

    const scaleIds = new Set(critSnap.docs.map(d => d.id));
    const deduped  = Math.floor(firstRatings / Math.max(1, scaleIds.size));

    return {
        pubsRated: pubsRated.size, personalAvg, perfectTens, worstOnes,
        writtenReviews, maxRatingsInMonth, activeMonths, pubsAdded,
        firstRatings: deduped, isTopRater, groupMaxRated,
        maxCategoriesOnOnePub, hasFullCategoryRating, totalCategories,
        hitListCount, crawlsCreated,
    };
}

// ── Helper: compute server badge ids ─────────────────────────────────────────
function computeServerBadgeIds(stats) {
    const earned = new Set();
    SERVER_BADGE_DEFINITIONS.forEach(b => { if (b.check(stats)) earned.add(b.id); });
    // Platinum — requires all gold earned
    const goldIds = SERVER_BADGE_DEFINITIONS.filter(b => b.tier === 'gold').map(b => b.id);
    if (goldIds.every(id => earned.has(id))) earned.add('platinum_palate');
    return earned;
}

// ── Helper: process badge unlocks for a user in a group ───────────────────────
async function processBadgeUnlocks(userId, groupId, displayName) {
    if (!userId || !groupId) return;

    let stats;
    try {
        stats = await computeServerStats(userId, groupId);
    } catch (err) {
        console.error(`processBadgeUnlocks: stat computation failed for ${userId}`, err);
        return;
    }

    const nowEarned = computeServerBadgeIds(stats);

    const badgeDocRef = db
        .collection('groups').doc(groupId)
        .collection('userBadges').doc(userId);

    const snap = await badgeDocRef.get();
    const existing = snap.exists ? (snap.data().earnedBadges || []) : [];
    const existingIds = new Set(existing.map(b => b.id));

    // New unlocks only
    const newUnlocks = [...nowEarned].filter(id => !existingIds.has(id));
    if (newUnlocks.length === 0) return;

    const now = admin.firestore.FieldValue.serverTimestamp();
    const newEntries = newUnlocks.map(id => ({ id, earnedAt: now }));

    // Write to userBadges doc
    await badgeDocRef.set(
        { earnedBadges: admin.firestore.FieldValue.arrayUnion(...newEntries) },
        { merge: true }
    );

    // Write recentUnlocks docs for the in-app feed (one doc per badge unlock)
    const batch = db.batch();
    newUnlocks.forEach(id => {
        const meta  = BADGE_META[id] || { name: id, emoji: '🏅' };
        const ref   = db.collection('groups').doc(groupId)
            .collection('recentUnlocks').doc();
        batch.set(ref, {
            userId,
            displayName: displayName || 'Someone',
            badgeId:     id,
            badgeName:   meta.name,
            badgeEmoji:  meta.emoji,
            unlockedAt:  now,
        });
    });
    await batch.commit();

    console.log(`Badge unlocks for ${userId} in group ${groupId}: ${newUnlocks.join(', ')}`);
}

// ── Trigger 1: Group-scoped scores ───────────────────────────────────────────
exports.onGroupScoreCreate = functions
    .region('europe-west2')
    .firestore
    .document('groups/{groupId}/scores/{scoreId}')
    .onCreate(async (snap, context) => {
        const { groupId } = context.params;
        const data = snap.data();

        await writeRateLimit(data.userId, context);

        // Fetch display name from users/public sub-doc (best-effort)
        let displayName = 'Someone';
        try {
            const userSnap = await db.collection('users').doc(data.userId)
                .collection('public').doc('profile').get();
            if (userSnap.exists) displayName = userSnap.data()?.displayName || displayName;
        } catch (_) {}

        await processBadgeUnlocks(data.userId, groupId, displayName);
        return null;
    });

// ── Trigger 2: Global / pub-level scores ─────────────────────────────────────
exports.onGlobalScoreCreate = functions
    .region('europe-west2')
    .firestore
    .document('pubs/{pubId}/scores/{scoreId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();
        return writeRateLimit(data.userId, context);
    });

// ── Stripe (checkout + webhook) ──────────────────────────────────────────────
// Re-exported from a separate module to keep this file focused. Both functions
// remain dormant until Stripe keys are configured via `firebase functions:config:set`.
const stripeModule = require('./stripe');
exports.createCheckoutSession = stripeModule.createCheckoutSession;
exports.createPortalSession   = stripeModule.createPortalSession;
exports.stripeWebhook          = stripeModule.stripeWebhook;

// ── AI Pub Crawl Generator ───────────────────────────────────────────────────
const { GoogleGenAI } = require('@google/genai');
const { defineSecret } = require('firebase-functions/params');
const geminiApiKey = defineSecret('GEMINI_API_KEY');

exports.generateAICrawl = functions
    .region('europe-west2')
    .runWith({ secrets: [geminiApiKey], timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be signed in to generate crawls.');
        }

        const { groupId, vibe, numStops, startLat, startLng } = data;
        if (!groupId || !vibe || !numStops) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: groupId, vibe, numStops.');
        }

        try {
            // 1. Fetch group's pubs
            const pubsSnap = await db.collection('groups').doc(groupId).collection('pubs').get();
            const pubs = [];
            
            pubsSnap.forEach(doc => {
                const pubData = doc.data();
                if (pubData.lat && pubData.lng) {
                    pubs.push({
                        id: doc.id,
                        name: pubData.name,
                        lat: pubData.lat,
                        lng: pubData.lng,
                        description: pubData.description || 'No description'
                    });
                }
            });

            if (pubs.length === 0) {
                throw new functions.https.HttpsError('failed-precondition', 'No pubs found in this group with location data.');
            }

            // Optional: If startLat/startLng provided, filter/sort by distance here to save tokens
            // (Assuming all group pubs for now if small enough)

            // 2. Initialize Gemini
            const apiKey = geminiApiKey.value();
            if (!apiKey) {
                throw new functions.https.HttpsError('internal', 'Gemini API key is not configured.');
            }
            const ai = new GoogleGenAI({ apiKey: apiKey });

            // 3. Prepare the Prompt
            const prompt = `
You are an expert pub crawl planner. The user wants a pub crawl with ${numStops} stops that matches the vibe: "${vibe}".
${startLat && startLng ? `The preferred starting location is approximately Lat: ${startLat}, Lng: ${startLng}. Try to start near here if possible, and ensure the pubs are in a logical walking route.` : `Create a logical walking route.`}

Here is the list of available pubs:
${JSON.stringify(pubs.map(p => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, description: p.description })), null, 2)}

Select exactly ${numStops} pubs from the list to form the crawl. 
Return ONLY a valid JSON array of strings, where each string is the ID of a selected pub in the order they should be visited. Do not include markdown formatting or explanations. Example output: ["pub1_id", "pub2_id"]
`;

            // 4. Call Gemini
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            let responseText = response.text;
            // Strip potential markdown block if AI adds it despite instructions
            if (responseText.startsWith('\`\`\`')) {
                responseText = responseText.replace(/^\`\`\`(json)?\n/, '').replace(/\n\`\`\`$/, '');
            }

            let routeIds = [];
            try {
                routeIds = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse Gemini response:", responseText);
                throw new functions.https.HttpsError('internal', 'AI returned an invalid response format.');
            }

            if (!Array.isArray(routeIds) || routeIds.length === 0) {
                 throw new functions.https.HttpsError('internal', 'AI returned an empty route.');
            }

            return { pubIds: routeIds };
        } catch (error) {
            console.error('Error generating AI Crawl:', error);
            throw new functions.https.HttpsError('internal', error.message || 'An error occurred during AI crawl generation.');
        }
    });

// ── Feature 1: AI Review Summarization (Vibe Check) ─────────────────────────
exports.generateVibeCheck = functions
    .region('europe-west2')
    .runWith({ secrets: [geminiApiKey], timeoutSeconds: 60 })
    .firestore.document('groups/{groupId}/scores/{scoreId}')
    .onWrite(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();
        
        if (!after || after.type !== 'text') return null;
        if (before && before.value === after.value) return null;

        const groupId = context.params.groupId;
        const pubId = after.pubId;
        if (!pubId) return null;

        try {
            const scoresSnap = await db.collection('groups').doc(groupId).collection('scores')
                .where('pubId', '==', pubId)
                .where('type', '==', 'text')
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();

            const reviews = [];
            scoresSnap.forEach(doc => {
                if (doc.data().value) reviews.push(doc.data().value);
            });

            if (reviews.length === 0) return null;

            const apiKey = geminiApiKey.value();
            if (!apiKey) return null;
            const ai = new GoogleGenAI({ apiKey: apiKey });

            const prompt = `
You are a witty, concise local pub guide. Read the following reviews for a pub and generate a short, snappy "Vibe Summary" (2-3 sentences max). 
Capture the general consensus, the atmosphere, and any standout features mentioned.

Reviews:
${reviews.map(r => "- " + r).join('\n')}

Summary:`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            const summary = response.text.trim();
            if (summary) {
                await db.collection('groups').doc(groupId).collection('pubs').doc(pubId).update({
                    vibeSummary: summary,
                    vibeSummaryUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
            return null;
        } catch (error) {
            console.error('Error generating vibe check:', error);
            return null;
        }
    });

// ── Feature 2: AI Automated Image Tagging ────────────────────────────────────
exports.tagPubPhoto = functions
    .region('europe-west2')
    .runWith({ secrets: [geminiApiKey], timeoutSeconds: 60 })
    .firestore.document('groups/{groupId}/pubs/{pubId}')
    .onWrite(async (change, context) => {
        const after = change.after.data();
        const before = change.before.data();

        if (!after || !after.photoURL) return null;
        if (before && before.photoURL === after.photoURL) return null;

        const groupId = context.params.groupId;
        const pubId = context.params.pubId;
        const photoUrl = after.photoURL;

        try {
            const apiKey = geminiApiKey.value();
            if (!apiKey) return null;
            const ai = new GoogleGenAI({ apiKey: apiKey });

            const imageResp = await fetch(photoUrl);
            const arrayBuffer = await imageResp.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString('base64');
            const mimeType = imageResp.headers.get('content-type') || 'image/jpeg';

            const prompt = `
Analyze this image of a pub and return a JSON array of up to 5 descriptive tags (e.g., "beer_garden", "live_music", "pool_table", "cozy", "sports_tv", "food", "cocktails", "historic"). 
If the image doesn't look like a pub or you cannot analyze it, return exactly ["Pub"].
Return ONLY a valid JSON array of strings, nothing else.`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    { inlineData: { data: base64Image, mimeType: mimeType } },
                    prompt
                ]
            });

            let responseText = response.text;
            if (responseText.startsWith('\`\`\`')) {
                responseText = responseText.replace(/^\`\`\`(json)?\n/, '').replace(/\n\`\`\`$/, '');
            }

            let tags = ["Pub"];
            try {
                const parsed = JSON.parse(responseText);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    tags = parsed;
                }
            } catch (e) {
                console.error('Failed to parse Gemini Vision tags:', responseText);
            }

            await db.collection('groups').doc(groupId).collection('pubs').doc(pubId).update({
                aiTags: tags
            });
            return null;
        } catch (error) {
            console.error('Error tagging pub photo:', error);
            await db.collection('groups').doc(groupId).collection('pubs').doc(pubId).update({
                aiTags: ["Pub"]
            });
            return null;
        }
    });

// ── Feature 3: AI Smart Search ───────────────────────────────────────────────
exports.aiSmartSearch = functions
    .region('europe-west2')
    .runWith({ secrets: [geminiApiKey], timeoutSeconds: 60 })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be signed in.');
        }

        const { groupId, query } = data;
        if (!groupId || !query) {
            throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters.');
        }

        try {
            const pubsSnap = await db.collection('groups').doc(groupId).collection('pubs').get();
            const pubs = [];
            
            pubsSnap.forEach(doc => {
                const pubData = doc.data();
                pubs.push({
                    id: doc.id,
                    name: pubData.name,
                    description: pubData.description || '',
                    vibeSummary: pubData.vibeSummary || '',
                    tags: pubData.aiTags || []
                });
            });

            if (pubs.length === 0) {
                return { pubIds: [] };
            }

            const apiKey = geminiApiKey.value();
            if (!apiKey) {
                throw new functions.https.HttpsError('internal', 'Gemini API key is not configured.');
            }
            const ai = new GoogleGenAI({ apiKey: apiKey });

            const prompt = `
The user is searching for a pub with the following query: "${query}"

Here is the list of available pubs with their metadata:
${JSON.stringify(pubs, null, 2)}

Identify the pubs that best match the user's search query. Rank them from best match to worst match, but only include pubs that actually match the intent of the query.
Return ONLY a valid JSON array of strings, where each string is the ID of a matched pub in order of relevance. Do not include markdown formatting or explanations. Example output: ["pub1_id", "pub2_id"]
If no pubs match, return an empty array: []
`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            let responseText = response.text;
            if (responseText.startsWith('\`\`\`')) {
                responseText = responseText.replace(/^\`\`\`(json)?\n/, '').replace(/\n\`\`\`$/, '');
            }

            let routeIds = [];
            try {
                routeIds = JSON.parse(responseText);
            } catch (e) {
                console.error("Failed to parse Gemini response:", responseText);
                throw new functions.https.HttpsError('internal', 'AI returned an invalid response format.');
            }

            return { pubIds: Array.isArray(routeIds) ? routeIds : [] };
        } catch (error) {
            console.error('Error in aiSmartSearch:', error);
            throw new functions.https.HttpsError('internal', error.message || 'An error occurred during smart search.');
        }
    });
