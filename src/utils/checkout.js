import { STRIPE_ENABLED, STRIPE_PRICES, STRIPE_PUBLISHABLE_KEY } from './stripeConfig';

/**
 * Start a Stripe Checkout flow for the given price key.
 *
 * Two-stage approach:
 *  1. If a Cloud Function endpoint is configured (VITE_STRIPE_CHECKOUT_ENDPOINT),
 *     call it to create a Checkout Session and redirect to the returned URL.
 *  2. Otherwise fall back to a `coming-soon` modal hook so the UI degrades
 *     gracefully when Stripe isn't wired up yet.
 *
 * @param {('premiumMonthly'|'premiumYearly'|'pubProMonthly'|'pubPlusMonthly')} priceKey
 * @param {{ user: object|null, userProfile: object|null, onUnavailable: () => void }} ctx
 */
export async function startCheckout(priceKey, { user, userProfile, onUnavailable }) {
    const priceId  = STRIPE_PRICES[priceKey];
    const endpoint = import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT || '';

    if (!STRIPE_ENABLED || !priceId || !endpoint) {
        onUnavailable?.();
        return;
    }

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priceId,
                userId: user?.uid || null,
                email:  user?.email || null,
                successUrl: `${window.location.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl:  `${window.location.origin}/pricing?canceled=1`,
                metadata: {
                    priceKey,
                    uid:  user?.uid || '',
                    plan: priceKey,
                },
            }),
        });

        if (!res.ok) throw new Error(`Checkout request failed (${res.status})`);
        const { url } = await res.json();
        if (url) {
            window.location.href = url;
        } else {
            throw new Error('No checkout URL returned');
        }
    } catch (err) {
        console.error('[checkout] failed', err);
        onUnavailable?.();
    }
}

export { STRIPE_ENABLED, STRIPE_PUBLISHABLE_KEY };
