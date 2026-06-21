# Pub Ranker — Product Requirements Document

## Problem statement (user verbatim)
> Can you review this site for me and see what we can improve I then want a
> mobile app for it too and to expand and make a way I can make money on it.
> The site is pubranker.uk and the code is in GitHub here
> https://github.com/lpdevspace/pub-ranker. The site is to add and review pubs
> in the local area with friends and to sell the data to pubs to improve.

## Tech stack
- Vite + React 19 + Tailwind 4
- Firebase (Auth, Firestore, Cloud Functions Gen 1 europe-west2, Storage)
- React Router 7
- Leaflet for maps, Chart.js for analytics
- Hosting: Firebase Hosting

## User personas
1. **Mate group organiser** — friends rating local pubs together
2. **Casual rater** — joined a group, just rates pubs
3. **Pub landlord / chain manager** — claims listing, monitors reviews (B2B)
4. **Super admin** — Pub Ranker operator

## Monetisation model (planned)
| Stream                         | Tier                 | Price          |
|--------------------------------|----------------------|----------------|
| Consumer subscription          | PubRanker+           | £2.99 / £19 pa |
| Pub subscription               | Pub Pro              | £19/mo         |
| Multi-site / chain             | Pub Plus             | £49/mo         |
| Featured listing               | Sponsored placement  | £15/mo or £49 one-off |
| Display ads (free tier only)   | Google AdSense       | passive        |
| Affiliate                      | OpenTable/Deliveroo  | commission     |
| Aggregated data licensing      | Custom               | bespoke        |

## Sprint 1 — Site improvements + monetization foundations  ✅ COMPLETE (Jan 2026)
- ✅ `PublicFooter` with Product / Company / Legal columns; replaces old footer
- ✅ `PublicNav` (sticky, glass-blur) for non-landing public pages
- ✅ `/pricing` — 4-tier table (Free / PubRanker+ / Pub Pro / Pub Plus) with
       monthly/yearly toggle, FAQ accordion, JSON-LD product schema, "Most
       popular" + "Best value" badges, graceful Stripe-unavailable banner
- ✅ `/for-pubs` — B2B landing with hero, 4 benefit cards, stats band, FAQ,
       dual CTAs (trial + pricing)
- ✅ `/privacy`, `/terms`, `/cookies` — UK GDPR-ready legal pages
- ✅ `/contact` — form with topic selector, writes to Firestore
       `contactRequests` collection, success state
- ✅ `/upgrade/success` — Stripe Checkout success landing with auto-redirect
- ✅ `SEO` component — vanilla title/description/OG/Twitter/JSON-LD meta
- ✅ `index.html` SEO meta defaults (OG image, canonical, og:locale en_GB)
- ✅ `public/robots.txt` and `public/sitemap.xml` (covers all public routes)
- ✅ Demo public groups fallback (`src/data/demoGroups.js`) — 5 fictional
       city groups shown when no real public groups exist, kills empty state
- ✅ Stripe integration scaffolded:
       - Frontend: `src/utils/stripeConfig.js` + `src/utils/checkout.js`
         (gracefully degrades to "coming soon" modal when keys missing)
       - Backend: `functions/stripe.js` adds `createCheckoutSession` (HTTPS)
         and `stripeWebhook` (subscribes to checkout.session.completed +
         customer.subscription.deleted). Both dormant until Stripe keys set
         via `firebase functions:config:set`
- ✅ AdSense placeholder component (`AdSlot`) — premium users + super-admins
       never see ads; non-configured envs show "Ad placeholder" dashed box
- ✅ Varied CTA copy on landing ("Start ranking — free" / "Settle it tonight")
- ✅ Mobile-responsive nav (secondary links hide < 640px)
- ✅ Refactor: `PublicSiteRouter` lazily loads each public sub-page → bundle
       splitting (Pricing 12.7kB gz, ForPubs 8.2kB gz, legal pages ~1-2kB gz)

## Sprint 2 — Pub B2B dashboard (backlog)
- [ ] Claim-your-pub flow with verification (£1 Stripe charge or postcard code)
- [ ] Pub Pro/Plus Stripe subscription + customer portal
- [ ] Pub analytics dashboard (criteria breakdown, trends, competitor benchmark)
- [ ] Respond-to-reviews UI
- [ ] Featured listing checkout (one-off £49 / £15 monthly)
- [ ] Multi-venue dashboard for Pub Plus

## Sprint 3 — PWA polish + push notifications (backlog)
- [ ] vite-plugin-pwa + service worker (offline group viewing)
- [ ] iOS splash screens + apple-touch-icons + add-to-home-screen prompt
- [ ] FCM push for "Mate rated The Red Lion 9.2!"
- [ ] Standalone-mode UI polish

## Sprint 4 — React Native (Expo) mobile app (backlog)
- [ ] Expo SDK 52 + Expo Router shell
- [ ] @react-native-firebase/* for Auth/Firestore/Functions/Storage
- [ ] Reuse hooks (`useGroupData`, `useScoreCalculations`) as shared package
- [ ] Native screens: Auth, Groups, Group detail, Map, Rate, Profile, Spin
- [ ] expo-location + expo-image-picker
- [ ] EAS Build → TestFlight + Play Internal

## Activation checklist for user (Sprint 1 follow-ups)
1. **Stripe** — Create account, products + prices for the 4 tiers, populate
   `.env` with the `VITE_STRIPE_*` vars. Run
   `cd functions && npm install stripe` and
   `firebase functions:config:set stripe.secret_key=sk_test_…
    stripe.webhook_secret=whsec_…`. Then
   `firebase deploy --only functions:createCheckoutSession,functions:stripeWebhook`.
2. **AdSense** — Once you have ~2k DAU, apply at
   https://www.google.com/adsense → set `VITE_ADSENSE_CLIENT_ID`.
3. **OG image** — Replace `/icon-512.png` reference in `index.html` with a
   social-share-optimised 1200×630 PNG for nicer link previews.
4. **Demo groups** — Once you have 3+ real `isPublic` groups in Firestore the
   demo data automatically falls away (no code change needed).

## Files added this sprint
- src/components/{PublicNav,PublicFooter,PublicPageLayout,AdSlot,SEO}.jsx
- src/pages/PublicSiteRouter.jsx
- src/pages/public/{PricingPage,ForPubsPage,PrivacyPage,TermsPage,
                    CookiesPage,ContactPage,UpgradeSuccessPage,LegalPage}.jsx
- src/data/demoGroups.js
- src/utils/{stripeConfig,checkout}.js
- public/{robots.txt,sitemap.xml}
- functions/stripe.js

## Files modified this sprint
- src/App.jsx (routes public pages via PublicSiteRouter)
- src/pages/PublicLandingPage.jsx (footer, demo-data fallback, varied CTAs,
                                   For Pubs + Pricing nav links, SEO)
- index.html (OG, Twitter, canonical, description)
- functions/index.js (exports Stripe functions)
- .env.example (Stripe + AdSense vars documented)
