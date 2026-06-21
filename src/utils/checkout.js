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
 * @param {('premiumMonthly'|'premiumYearly'|'pubProMonthly'|'pubPlusMonthly'|'featuredOneOff'|'featuredMonthly')} priceKey
 * @param {{ user: object|null, userProfile: object|null, venueId?: string, onUnavailable: () => void }} ctx
 */
export async function startCheckout(priceKey, { user, userProfile, venueId, onUnavailable }) {
    const priceId  = STRIPE_PRICES[priceKey];
    const endpoint = import.meta.env.VITE_STRIPE_CHECKOUT_ENDPOINT || '';

    if (!STRIPE_ENABLED || !priceId || !endpoint) {
        onUnavailable?.();
        return;
    }

    // Featured one-off purchases are NOT subscriptions in Stripe-speak
    const mode = priceKey === 'featuredOneOff' ? 'payment' : 'subscription';

    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                priceId,
                mode,
                userId: user?.uid || null,
                email:  user?.email || null,
                successUrl: `${window.location.origin}/upgrade/success?session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl:  `${window.location.origin}/pricing?canceled=1`,
                metadata: {
                    priceKey,
                    uid:     user?.uid || '',
                    plan:    priceKey,
                    venueId: venueId || '',
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

/**
 * Open the Stripe Customer Portal for an existing subscriber.
 *
 * @param {{ stripeCustomerId: string }} ctx
 */
export async function openCustomerPortal({ stripeCustomerId, onUnavailable }) {
    const endpoint = import.meta.env.VITE_STRIPE_PORTAL_ENDPOINT || '';
    if (!endpoint || !stripeCustomerId) { onUnavailable?.(); return; }
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: stripeCustomerId,
                returnUrl:  `${window.location.origin}/`,
            }),
        });
        if (!res.ok) throw new Error(`Portal request failed (${res.status})`);
        const { url } = await res.json();
        if (url) window.location.href = url;
        else onUnavailable?.();
    } catch (e) {
        console.error('[portal] failed', e);
        onUnavailable?.();
    }
}

export { STRIPE_ENABLED, STRIPE_PUBLISHABLE_KEY };
