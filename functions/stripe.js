/**
 * Stripe Cloud Functions for Pub Ranker
 *
 * Exports:
 *   - createCheckoutSession  : HTTPS function the frontend calls to start a checkout.
 *   - stripeWebhook          : HTTPS function Stripe calls when subscription events happen.
 *
 * Activation (one-off setup):
 *   1. From the repo root:  cd functions && npm install stripe
 *   2. Configure Stripe keys (test or live):
 *        firebase functions:config:set \
 *          stripe.secret_key=sk_test_xxx \
 *          stripe.webhook_secret=whsec_xxx
 *   3. Deploy:
 *        firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook
 *   4. In the Stripe Dashboard add the deployed `stripeWebhook` URL as a webhook
 *      endpoint subscribed to:
 *        - checkout.session.completed
 *        - customer.subscription.updated
 *        - customer.subscription.deleted
 *
 * Until that's done, these functions are exported but harmless — the frontend
 * checks `VITE_STRIPE_CHECKOUT_ENDPOINT` and falls back to a "Coming Soon" modal.
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');

// Stripe is loaded lazily so the rest of the codebase keeps working even if
// the `stripe` npm package isn't installed yet.
let stripeSingleton = null;
function getStripe() {
    if (stripeSingleton) return stripeSingleton;
    let Stripe;
    try {
        Stripe = require('stripe');
    } catch (_) {
        return null;
    }
    const key = (functions.config().stripe || {}).secret_key;
    if (!key) return null;
    stripeSingleton = Stripe(key);
    return stripeSingleton;
}

if (!admin.apps.length) admin.initializeApp();

// ─── Allowed origins for CORS ────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
    'https://pubranker.uk',
    'https://www.pubranker.uk',
    'https://business.pubranker.uk',
    'http://localhost:5173',
    'http://localhost:4173',
]);

function setCors(req, res) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        res.set('Access-Control-Allow-Origin', origin);
    } else {
        res.set('Access-Control-Allow-Origin', 'https://pubranker.uk');
    }
    res.set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// ─── 1. Create Checkout Session ──────────────────────────────────────────────
exports.createCheckoutSession = functions
    .region('europe-west2')
    .https.onRequest(async (req, res) => {
        setCors(req, res);
        if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
        if (req.method !== 'POST')    { res.status(405).json({ error: 'POST only' }); return; }

        const stripe = getStripe();
        if (!stripe) {
            res.status(503).json({ error: 'Stripe is not configured on this server yet.' });
            return;
        }

        try {
            const { priceId, userId, email, successUrl, cancelUrl, metadata = {} } = req.body || {};
            if (!priceId)    return res.status(400).json({ error: 'Missing priceId' });
            if (!successUrl) return res.status(400).json({ error: 'Missing successUrl' });
            if (!cancelUrl)  return res.status(400).json({ error: 'Missing cancelUrl' });

            // Allowlist origins for the success/cancel redirects to prevent
            // open-redirect abuse.
            const okHost = (u) => {
                try {
                    const { origin } = new URL(u);
                    return ALLOWED_ORIGINS.has(origin);
                } catch (_) { return false; }
            };
            if (!okHost(successUrl) || !okHost(cancelUrl)) {
                return res.status(400).json({ error: 'Invalid redirect URL' });
            }

            const session = await stripe.checkout.sessions.create({
                mode: req.body?.mode || 'subscription',
                line_items: [{ price: priceId, quantity: 1 }],
                success_url: successUrl,
                cancel_url:  cancelUrl,
                customer_email: email || undefined,
                client_reference_id: userId || undefined,
                metadata: {
                    ...metadata,
                    uid: userId || '',
                },
                allow_promotion_codes: true,
            });

            // Persist a pending transaction so we can reconcile if the webhook is
            // delayed or fails to arrive.
            await admin.firestore().collection('payment_transactions').doc(session.id).set({
                sessionId: session.id,
                userId:    userId || null,
                email:     email  || null,
                priceId,
                metadata,
                status:    'initiated',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            res.status(200).json({ id: session.id, url: session.url });
        } catch (err) {
            console.error('createCheckoutSession error', err);
            res.status(500).json({ error: err.message || 'Internal error' });
        }
    });

// ─── 3. Create Customer Portal Session ───────────────────────────────────────
// Lets a subscribed pub manage their card, cancel, or download invoices via
// the hosted Stripe Customer Portal.
exports.createPortalSession = functions
    .region('europe-west2')
    .https.onRequest(async (req, res) => {
        setCors(req, res);
        if (req.method === 'OPTIONS') { res.status(204).send(''); return; }
        if (req.method !== 'POST')    { res.status(405).json({ error: 'POST only' }); return; }

        const stripe = getStripe();
        if (!stripe) return res.status(503).json({ error: 'Stripe is not configured.' });

        try {
            const { customerId, returnUrl } = req.body || {};
            if (!customerId) return res.status(400).json({ error: 'Missing customerId' });
            if (!returnUrl)  return res.status(400).json({ error: 'Missing returnUrl' });

            const okHost = (u) => {
                try { return ALLOWED_ORIGINS.has(new URL(u).origin); } catch (_) { return false; }
            };
            if (!okHost(returnUrl)) return res.status(400).json({ error: 'Invalid returnUrl' });

            const session = await stripe.billingPortal.sessions.create({
                customer: customerId,
                return_url: returnUrl,
            });
            res.status(200).json({ url: session.url });
        } catch (err) {
            console.error('createPortalSession error', err);
            res.status(500).json({ error: err.message || 'Internal error' });
        }
    });

// ─── 4. Stripe Webhook ───────────────────────────────────────────────────────
exports.stripeWebhook = functions
    .region('europe-west2')
    .runWith({ memory: '256MB' })
    .https.onRequest(async (req, res) => {
        const stripe = getStripe();
        if (!stripe) return res.status(503).send('Stripe not configured');

        const webhookSecret = (functions.config().stripe || {}).webhook_secret;
        if (!webhookSecret) return res.status(503).send('Webhook secret not configured');

        let event;
        try {
            event = stripe.webhooks.constructEvent(
                req.rawBody,
                req.headers['stripe-signature'],
                webhookSecret,
            );
        } catch (err) {
            console.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        const db = admin.firestore();

        try {
            switch (event.type) {
                case 'checkout.session.completed': {
                    const session  = event.data.object;
                    const uid      = session.client_reference_id || session.metadata?.uid;
                    const priceKey = session.metadata?.priceKey || session.metadata?.plan || 'premiumMonthly';
                    // Map priceKey → high-level plan label
                    const planLabel =
                        priceKey === 'pubProMonthly'  ? 'pubPro'  :
                        priceKey === 'pubPlusMonthly' ? 'pubPlus' :
                        'premium';

                    if (uid) {
                        await db.collection('users').doc(uid).set({
                            premium: true,
                            premiumPlan: planLabel,
                            premiumPriceKey: priceKey,
                            stripeCustomerId: session.customer || null,
                            stripeSubscriptionId: session.subscription || null,
                            premiumActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        }, { merge: true });
                    }
                    // If the session metadata pinned a specific venue, also write
                    // venue-level plan (used by chains with per-pub subscriptions).
                    if (session.metadata?.venueId) {
                        await db.collection('pubs').doc(session.metadata.venueId).set({
                            premiumPlan: planLabel,
                            stripeSubscriptionId: session.subscription || null,
                            premiumActivatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        }, { merge: true });
                    }
                    // Featured-listing one-off or subscription: extend featured window
                    if (priceKey === 'featuredOneOff' || priceKey === 'featuredMonthly') {
                        const days = priceKey === 'featuredOneOff' ? 30 : 31;
                        const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
                        if (session.metadata?.venueId) {
                            await db.collection('pubs').doc(session.metadata.venueId).set({
                                featuredUntil: admin.firestore.Timestamp.fromDate(until),
                                featuredPurchasedAt: admin.firestore.FieldValue.serverTimestamp(),
                            }, { merge: true });
                        }
                    }
                    await db.collection('payment_transactions').doc(session.id).set({
                        status: 'completed',
                        paymentStatus: session.payment_status || 'paid',
                        completedAt: admin.firestore.FieldValue.serverTimestamp(),
                    }, { merge: true });
                    break;
                }
                case 'customer.subscription.updated': {
                    // Track active/past_due/canceled state on the user doc
                    const sub = event.data.object;
                    const customerId = sub.customer;
                    const userSnap = await db.collection('users')
                        .where('stripeCustomerId', '==', customerId).limit(1).get();
                    if (!userSnap.empty) {
                        await userSnap.docs[0].ref.set({
                            stripeSubscriptionStatus: sub.status,
                            stripeCurrentPeriodEnd: sub.current_period_end || null,
                        }, { merge: true });
                    }
                    break;
                }
                case 'customer.subscription.deleted': {
                    const sub = event.data.object;
                    const customerId = sub.customer;
                    const userSnap = await db.collection('users')
                        .where('stripeCustomerId', '==', customerId).limit(1).get();
                    if (!userSnap.empty) {
                        await userSnap.docs[0].ref.set({
                            premium: false,
                            premiumPlan: null,
                            premiumCancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                        }, { merge: true });
                    }
                    break;
                }
                default:
                    break;
            }
            res.json({ received: true });
        } catch (err) {
            console.error('Webhook handler error', err);
            res.status(500).send('Internal error');
        }
    });
