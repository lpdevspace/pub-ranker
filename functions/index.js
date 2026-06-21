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
exports.stripeWebhook          = stripeModule.stripeWebhook;
