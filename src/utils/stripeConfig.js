/**
 * Stripe configuration — test mode by default.
 *
 * To activate real checkout:
 *  1. Create a Stripe account → https://dashboard.stripe.com/register
 *  2. Create your products + prices in test mode → https://dashboard.stripe.com/test/products
 *  3. Copy the publishable key and price IDs into a .env file:
 *
 *     VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxx
 *     VITE_STRIPE_PRICE_PREMIUM_MONTHLY=price_xxxxxxxxxxxx
 *     VITE_STRIPE_PRICE_PREMIUM_YEARLY=price_xxxxxxxxxxxx
 *     VITE_STRIPE_PRICE_PUB_PRO_MONTHLY=price_xxxxxxxxxxxx
 *     VITE_STRIPE_PRICE_PUB_PLUS_MONTHLY=price_xxxxxxxxxxxx
 *
 *  4. Deploy the Cloud Function `createCheckoutSession` (see functions/index.js).
 *  5. (Production) Configure the Stripe webhook to hit your
 *     `stripeWebhook` Cloud Function URL.
 *
 * Until then, the "Upgrade" buttons gracefully degrade to a friendly
 * "Coming soon" modal so the rest of the site stays usable.
 */

export const STRIPE_PUBLISHABLE_KEY =
    import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const STRIPE_PRICES = {
    premiumMonthly: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY  || '',
    premiumYearly:  import.meta.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY   || '',
    pubProMonthly:  import.meta.env.VITE_STRIPE_PRICE_PUB_PRO_MONTHLY  || '',
    pubPlusMonthly: import.meta.env.VITE_STRIPE_PRICE_PUB_PLUS_MONTHLY || '',
};

export const STRIPE_ENABLED = Boolean(STRIPE_PUBLISHABLE_KEY);

/**
 * Tier metadata (display-only; canonical prices live in Stripe Dashboard).
 */
export const TIERS = {
    free: {
        key: 'free',
        name: 'Free Pint',
        priceMonthly: 0,
        priceYearly: 0,
        tagline: 'Always free for mates',
        cta: 'Get started',
        ctaPath: '/auth',
        audience: 'b2c',
        features: [
            'Up to 3 groups',
            'Unlimited pubs',
            'Live group leaderboard',
            'Map & spin-the-wheel',
            'Group chat & invites',
            'Standard badges',
        ],
        featuresMissing: [
            'Ad-free experience',
            'Advanced filters',
        ],
    },
    premium: {
        key: 'premium',
        name: 'PubRanker+',
        priceMonthly: 2.99,
        priceYearly: 19,
        tagline: 'For dedicated pint hunters',
        cta: 'Upgrade',
        ctaAction: 'checkout_premium',
        audience: 'b2c',
        highlight: true,
        features: [
            'Unlimited groups',
            'Ad-free everywhere',
            'Advanced filters (open now, dog-friendly…)',
            'Exclusive badges & profile flair',
            'Group analytics & rating insights',
            'Export your data (CSV)',
            'Early access to new features',
        ],
    },
    pubPro: {
        key: 'pubPro',
        name: 'Pub Pro',
        priceMonthly: 19,
        priceYearly: 190,
        tagline: 'For independent pubs',
        cta: 'Start free trial',
        ctaAction: 'checkout_pubpro',
        audience: 'b2b',
        features: [
            'Claim your pub listing',
            'Full review feed (all criteria)',
            'Respond to reviews publicly',
            'Monthly performance email',
            '"Verified pub" badge',
            'Basic competitor benchmarks',
        ],
    },
    pubPlus: {
        key: 'pubPlus',
        name: 'Pub Plus',
        priceMonthly: 49,
        priceYearly: 490,
        tagline: 'For multi-site & chains',
        cta: 'Start free trial',
        ctaAction: 'checkout_pubplus',
        audience: 'b2b',
        highlight: true,
        features: [
            'Everything in Pub Pro',
            'Multi-venue dashboard',
            'Full competitor benchmarking',
            'CSV export of reviews & scores',
            'Featured listing credits (2/month)',
            'Priority support',
        ],
    },
};
