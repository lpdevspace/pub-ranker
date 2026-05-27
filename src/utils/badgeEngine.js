/**
 * badgeEngine.js
 * Pure utility — no Firebase imports. Computes badge state from already-loaded data.
 */

// ── Badge tier colours ───────────────────────────────────────────────────────
export const TIER_STYLES = {
    bronze:    { ring: '#cd7f32', bg: 'rgba(205,127,50,0.12)',  label: 'Bronze',    star: '🥉' },
    silver:    { ring: '#9ca3af', bg: 'rgba(156,163,175,0.12)', label: 'Silver',    star: '🥈' },
    gold:      { ring: '#d97706', bg: 'rgba(217,119,6,0.15)',   label: 'Gold',      star: '🥇' },
    legendary: { ring: '#7c3aed', bg: 'rgba(124,58,237,0.15)', label: 'Legendary', star: '⭐' },
};

// ── Badge definitions ────────────────────────────────────────────────────────
export const BADGE_DEFINITIONS = [
    // ── Explorer ──────────────────────────────────────────────────────────────
    {
        id: 'first_pint',
        name: 'First Pint',
        description: 'Rate your first pub',
        emoji: '🍺',
        tier: 'bronze',
        category: 'explorer',
        check: s => s.pubsRated >= 1,
        progress: s => Math.min(100, (s.pubsRated / 1) * 100),
        target: 1,
        metric: s => s.pubsRated,
    },
    {
        id: 'local_regular',
        name: 'Local Regular',
        description: 'Rate 10 pubs',
        emoji: '📍',
        tier: 'bronze',
        category: 'explorer',
        check: s => s.pubsRated >= 10,
        progress: s => Math.min(100, (s.pubsRated / 10) * 100),
        target: 10,
        metric: s => s.pubsRated,
    },
    {
        id: 'pub_hopper',
        name: 'Pub Hopper',
        description: 'Rate 25 pubs',
        emoji: '🦘',
        tier: 'silver',
        category: 'explorer',
        check: s => s.pubsRated >= 25,
        progress: s => Math.min(100, (s.pubsRated / 25) * 100),
        target: 25,
        metric: s => s.pubsRated,
    },
    {
        id: 'seasoned_crawler',
        name: 'Seasoned Crawler',
        description: 'Rate 50 pubs',
        emoji: '🗺️',
        tier: 'silver',
        category: 'explorer',
        check: s => s.pubsRated >= 50,
        progress: s => Math.min(100, (s.pubsRated / 50) * 100),
        target: 50,
        metric: s => s.pubsRated,
    },
    {
        id: 'century_club',
        name: 'Century Club',
        description: 'Rate 100 pubs',
        emoji: '💯',
        tier: 'gold',
        category: 'explorer',
        check: s => s.pubsRated >= 100,
        progress: s => Math.min(100, (s.pubsRated / 100) * 100),
        target: 100,
        metric: s => s.pubsRated,
    },
    {
        id: 'legend_of_the_local',
        name: 'Legend of the Local',
        description: 'Rate 200 pubs',
        emoji: '👑',
        tier: 'legendary',
        category: 'explorer',
        check: s => s.pubsRated >= 200,
        progress: s => Math.min(100, (s.pubsRated / 200) * 100),
        target: 200,
        metric: s => s.pubsRated,
    },

    // ── Critic ────────────────────────────────────────────────────────────────
    {
        id: 'generous_soul',
        name: 'Generous Soul',
        description: 'Maintain a personal average of 8.0 or above',
        emoji: '😇',
        tier: 'bronze',
        category: 'critic',
        check: s => s.pubsRated >= 5 && s.personalAvg >= 8.0,
        progress: s => s.pubsRated < 5 ? Math.min(100, (s.pubsRated / 5) * 100) : Math.min(100, (s.personalAvg / 8.0) * 100),
        target: null,
        metric: s => s.personalAvg,
    },
    {
        id: 'tough_love',
        name: 'Tough Love',
        description: 'Maintain a personal average of 4.5 or below (5+ pubs)',
        emoji: '😤',
        tier: 'bronze',
        category: 'critic',
        check: s => s.pubsRated >= 5 && s.personalAvg <= 4.5,
        progress: s => s.pubsRated < 5 ? Math.min(100, (s.pubsRated / 5) * 100) : 100,
        target: null,
        metric: s => s.personalAvg,
    },
    {
        id: 'the_perfectionist',
        name: 'The Perfectionist',
        description: 'Give at least one 10/10 score',
        emoji: '🎯',
        tier: 'bronze',
        category: 'critic',
        check: s => s.perfectTens >= 1,
        progress: s => Math.min(100, s.perfectTens * 100),
        target: 1,
        metric: s => s.perfectTens,
    },
    {
        id: 'the_harsh_truth',
        name: 'The Harsh Truth',
        description: 'Give at least one 1/10 score',
        emoji: '💀',
        tier: 'bronze',
        category: 'critic',
        check: s => s.worstOnes >= 1,
        progress: s => Math.min(100, s.worstOnes * 100),
        target: 1,
        metric: s => s.worstOnes,
    },
    {
        id: 'consistent_critic',
        name: 'Consistent Critic',
        description: 'Rate 5+ pubs in a single calendar month',
        emoji: '📝',
        tier: 'silver',
        category: 'critic',
        check: s => s.maxRatingsInMonth >= 5,
        progress: s => Math.min(100, (s.maxRatingsInMonth / 5) * 100),
        target: 5,
        metric: s => s.maxRatingsInMonth,
    },
    {
        id: 'review_royalty',
        name: 'Review Royalty',
        description: 'Write 10 or more text reviews',
        emoji: '✍️',
        tier: 'silver',
        category: 'critic',
        check: s => s.writtenReviews >= 10,
        progress: s => Math.min(100, (s.writtenReviews / 10) * 100),
        target: 10,
        metric: s => s.writtenReviews,
    },

    // ── Social ────────────────────────────────────────────────────────────────
    {
        id: 'first_addition',
        name: 'First Addition',
        description: 'Add your first pub to the group directory',
        emoji: '➕',
        tier: 'bronze',
        category: 'social',
        check: s => s.pubsAdded >= 1,
        progress: s => Math.min(100, s.pubsAdded * 100),
        target: 1,
        metric: s => s.pubsAdded,
    },
    {
        id: 'directory_builder',
        name: 'Directory Builder',
        description: 'Add 10 pubs to the group directory',
        emoji: '🏗️',
        tier: 'silver',
        category: 'social',
        check: s => s.pubsAdded >= 10,
        progress: s => Math.min(100, (s.pubsAdded / 10) * 100),
        target: 10,
        metric: s => s.pubsAdded,
    },
    {
        id: 'top_of_the_pops',
        name: 'Top of the Pops',
        description: 'Rate the most pubs in the group',
        emoji: '🎤',
        tier: 'gold',
        category: 'social',
        check: s => s.isTopRater,
        progress: s => s.isTopRater ? 100 : Math.min(99, (s.pubsRated / Math.max(1, s.groupMaxRated)) * 100),
        target: null,
        metric: s => s.pubsRated,
    },
    {
        id: 'trendsetter',
        name: 'Trendsetter',
        description: 'Be the first person to rate a pub in the group',
        emoji: '🌟',
        tier: 'silver',
        category: 'social',
        check: s => s.firstRatings >= 1,
        progress: s => Math.min(100, s.firstRatings * 100),
        target: 1,
        metric: s => s.firstRatings,
    },
    {
        id: 'crawl_organiser',
        name: 'Crawl Organiser',
        description: 'Create your first pub crawl',
        emoji: '🗓️',
        tier: 'bronze',
        category: 'social',
        check: s => s.crawlsCreated >= 1,
        progress: s => Math.min(100, s.crawlsCreated * 100),
        target: 1,
        metric: s => s.crawlsCreated,
    },

    // ── Loyalty ───────────────────────────────────────────────────────────────
    {
        id: 'hitlister',
        name: 'The Hitlister',
        description: 'Add 5 pubs to your Hit List',
        emoji: '🎯',
        tier: 'bronze',
        category: 'loyalty',
        check: s => s.hitListCount >= 5,
        progress: s => Math.min(100, (s.hitListCount / 5) * 100),
        target: 5,
        metric: s => s.hitListCount,
    },
    {
        id: 'all_rounder',
        name: 'All Rounder',
        description: 'Score in every available rating category on a single pub',
        emoji: '🎪',
        tier: 'silver',
        category: 'loyalty',
        check: s => s.hasFullCategoryRating,
        progress: s => s.hasFullCategoryRating ? 100 : Math.min(99, (s.maxCategoriesOnOnePub / Math.max(1, s.totalCategories)) * 100),
        target: null,
        metric: s => s.maxCategoriesOnOnePub,
    },
    {
        id: 'dedicated_drinker',
        name: 'Dedicated Drinker',
        description: 'Rate pubs in 3 or more different months',
        emoji: '📅',
        tier: 'silver',
        category: 'loyalty',
        check: s => s.activeMonths >= 3,
        progress: s => Math.min(100, (s.activeMonths / 3) * 100),
        target: 3,
        metric: s => s.activeMonths,
    },
    {
        id: 'platinum_palate',
        name: 'Platinum Palate',
        description: 'Earn all Gold tier badges',
        emoji: '💎',
        tier: 'legendary',
        category: 'loyalty',
        check: (s, allBadges) => {
            if (!allBadges) return false;
            return allBadges.filter(b => b.tier === 'gold').every(b => b.earned);
        },
        progress: (s, allBadges) => {
            if (!allBadges) return 0;
            const goldBadges = allBadges.filter(b => b.tier === 'gold');
            const earned = goldBadges.filter(b => b.earned).length;
            return Math.min(100, (earned / Math.max(1, goldBadges.length)) * 100);
        },
        target: null,
        metric: s => 0,
    },
];

// ── Stats computation ────────────────────────────────────────────────────────
/**
 * Derives all stats needed for badge checks from raw app data.
 * @param {string} userId
 * @param {Array}  pubs
 * @param {object} scores  — { [pubId]: { [criteriaId]: [ { userId, value, type, pubId, createdAt } ] } }
 * @param {Array}  criteria
 * @param {Array}  allUsers
 * @param {number} crawlsCreated
 * @returns {object} stats
 */
export function computeUserStats(userId, pubs = [], scores = {}, criteria = [], allUsers = [], crawlsCreated = 0) {
    const safePubs  = Array.isArray(pubs) ? pubs : [];
    const safeCrit  = Array.isArray(criteria) ? criteria : [];
    const scaleIds  = new Set(safeCrit.filter(c => c.type === 'scale').map(c => c.id));
    const totalCategories = scaleIds.size;

    const pubsRated    = new Set();
    const ratingTimes  = []; // { pubId, createdAt }
    let perfectTens    = 0;
    let worstOnes      = 0;
    let writtenReviews = 0;
    let sumScores      = 0;
    let countScores    = 0;

    // Per-pub: how many categories has this user scored on each pub
    const categoriesPerPub = {}; // pubId → Set of criteriaIds
    // "first rater" count — pubs where this user was the first to submit a scale score
    let firstRatings = 0;

    Object.entries(scores).forEach(([pubId, pubScores]) => {
        if (typeof pubScores !== 'object') return;
        Object.entries(pubScores).forEach(([critId, critScores]) => {
            const arr = Array.isArray(critScores) ? critScores : [];
            const myScore = arr.find(s => s.userId === userId);
            if (!myScore) return;

            if (myScore.type === 'scale' && myScore.value != null) {
                pubsRated.add(pubId);
                sumScores  += myScore.value;
                countScores++;
                if (myScore.value === 10) perfectTens++;
                if (myScore.value === 1)  worstOnes++;
                if (myScore.createdAt) ratingTimes.push({ pubId, createdAt: myScore.createdAt });

                if (!categoriesPerPub[pubId]) categoriesPerPub[pubId] = new Set();
                categoriesPerPub[pubId].add(critId);

                // First rater: my score has the earliest createdAt on this pub+criteria
                if (myScore.createdAt) {
                    const sorted = arr
                        .filter(s => s.type === 'scale' && s.createdAt)
                        .sort((a, b) => (a.createdAt?.toMillis?.() ?? 0) - (b.createdAt?.toMillis?.() ?? 0));
                    if (sorted[0]?.userId === userId) firstRatings++;
                }
            }
            if (myScore.type === 'text' && myScore.value?.toString().trim().length > 0) {
                writtenReviews++;
            }
        });
    });

    const personalAvg = countScores > 0 ? sumScores / countScores : 0;

    // Monthly distribution of ratings
    const monthCounts = {};
    ratingTimes.forEach(({ createdAt }) => {
        const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        monthCounts[key] = (monthCounts[key] || 0) + 1;
    });
    const maxRatingsInMonth = Math.max(0, ...Object.values(monthCounts));
    const activeMonths = Object.keys(monthCounts).length;

    // Pubs added by user
    const pubsAdded = safePubs.filter(p => p.addedBy === userId).length;

    // Max categories scored on a single pub
    const maxCategoriesOnOnePub = Math.max(0, ...Object.values(categoriesPerPub).map(s => s.size));
    const hasFullCategoryRating = totalCategories > 0 && maxCategoriesOnOnePub >= totalCategories;

    // Is this user the top rater in the group?
    const userRatingCounts = {};
    Object.values(scores).forEach(pubScores => {
        if (typeof pubScores !== 'object') return;
        Object.values(pubScores).forEach(critScores => {
            const arr = Array.isArray(critScores) ? critScores : [];
            arr.forEach(s => {
                if (s.type === 'scale' && s.value != null && s.userId) {
                    userRatingCounts[s.userId] = (userRatingCounts[s.userId] || new Set());
                    userRatingCounts[s.userId].add(s.pubId || '__');
                }
            });
        });
    });
    const groupMaxRated = Math.max(0, ...Object.values(userRatingCounts).map(s => s.size));
    const isTopRater = pubsRated.size > 0 && pubsRated.size >= groupMaxRated;

    // Hit list count (pubs on user's toVisit)
    const hitListCount = safePubs.filter(p => p.toVisitBy?.includes?.(userId)).length;

    return {
        pubsRated: pubsRated.size,
        personalAvg,
        perfectTens,
        worstOnes,
        writtenReviews,
        maxRatingsInMonth,
        activeMonths,
        pubsAdded,
        firstRatings: Math.floor(firstRatings / Math.max(1, scaleIds.size)), // de-dupe per pub
        isTopRater,
        groupMaxRated,
        maxCategoriesOnOnePub,
        hasFullCategoryRating,
        totalCategories,
        hitListCount,
        crawlsCreated,
    };
}

/**
 * Returns full badge list with earned + progress for a user.
 */
export function computeBadges(userId, pubs, scores, criteria, allUsers, crawlsCreated = 0) {
    const stats = computeUserStats(userId, pubs, scores, criteria, allUsers, crawlsCreated);

    // First pass — compute without platinum (which depends on gold badges)
    const withoutPlatinum = BADGE_DEFINITIONS.filter(b => b.id !== 'platinum_palate').map(badge => ({
        ...badge,
        earned: badge.check(stats, null),
        progress: badge.progress(stats, null),
        currentValue: badge.metric(stats),
    }));

    // Second pass — platinum depends on all gold badges being earned
    const platinumDef = BADGE_DEFINITIONS.find(b => b.id === 'platinum_palate');
    const platinum = platinumDef ? {
        ...platinumDef,
        earned: platinumDef.check(stats, withoutPlatinum),
        progress: platinumDef.progress(stats, withoutPlatinum),
        currentValue: platinumDef.metric(stats),
    } : null;

    return [...withoutPlatinum, ...(platinum ? [platinum] : [])];
}

export const BADGE_CATEGORIES = [
    { id: 'all',      label: 'All',      emoji: '🏅' },
    { id: 'explorer', label: 'Explorer', emoji: '🗺️' },
    { id: 'critic',   label: 'Critic',   emoji: '✍️' },
    { id: 'social',   label: 'Social',   emoji: '👥' },
    { id: 'loyalty',  label: 'Loyalty',  emoji: '❤️' },
];
