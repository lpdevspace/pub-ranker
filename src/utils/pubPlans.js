/**
 * Tier helpers — single source of truth for which features each pub plan unlocks.
 *
 * Pub Pro  (£19/mo)  → criteria breakdown, trends, review responses, basic competitor band
 * Pub Plus (£49/mo)  → everything in Pro + full competitor leaderboard + multi-venue +
 *                      CSV export + 2 featured-listing credits/month
 */

export const PUB_PLANS = {
    none:      { key: 'none',      label: 'Free',     rank: 0 },
    pubPro:    { key: 'pubPro',    label: 'Pub Pro',  rank: 1, priceLabel: '£19/mo' },
    pubPlus:   { key: 'pubPlus',   label: 'Pub Plus', rank: 2, priceLabel: '£49/mo' },
};

const FEATURES = {
    basicKpis:           { minRank: 0 },
    recentReviews:       { minRank: 0 },
    criteriaBreakdown:   { minRank: 1 },
    trendChart:          { minRank: 1 },
    reviewResponses:     { minRank: 1 },
    basicCompetitor:     { minRank: 1 },
    fullCompetitor:      { minRank: 2 },
    multiVenue:          { minRank: 2 },
    csvExport:           { minRank: 2 },
    featuredCredits:     { minRank: 2 },
};

/**
 * Detect the current plan for a claimed venue.
 *
 *  - Owner-level subscription on the user profile (set by the Stripe webhook) wins.
 *  - Venue-level override (`venue.premiumPlan`) is supported for chains where
 *    each pub has its own plan.
 *  - Legacy: respects the existing localStorage `premium_unlocked_{venueId}` flag
 *    so existing testers don't lose access.
 */
export function getPlanForVenue(userProfile, venue) {
    if (!venue) return PUB_PLANS.none;

    // Venue-specific subscription wins (Pub Plus multi-venue case)
    if (venue.premiumPlan && PUB_PLANS[venue.premiumPlan]) {
        return PUB_PLANS[venue.premiumPlan];
    }

    // Owner-level subscription
    if (userProfile?.premiumPlan && PUB_PLANS[userProfile.premiumPlan]) {
        return PUB_PLANS[userProfile.premiumPlan];
    }

    // Legacy localStorage unlock (preserves existing premium testers)
    try {
        if (typeof window !== 'undefined'
            && localStorage.getItem(`premium_unlocked_${venue.id}`) === 'true') {
            return PUB_PLANS.pubPro;
        }
    } catch (_) { /* private mode */ }

    return PUB_PLANS.none;
}

export function canUseFeature(plan, featureKey) {
    const f = FEATURES[featureKey];
    if (!f) return false;
    return (plan?.rank ?? 0) >= f.minRank;
}
