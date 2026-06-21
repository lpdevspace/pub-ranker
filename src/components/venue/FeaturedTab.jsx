import { useState } from 'react';
import PremiumLock from './PremiumLock';

/**
 * FeaturedTab — promote a venue to "Featured" status. Two purchase modes:
 *
 *  - One-off (£49)        — 30 days of featured placement
 *  - Monthly (£15/mo)     — rolling featured subscription
 *
 * Pub Plus subscribers get 2 free featured credits per month and can toggle
 * featured status without checkout.
 */
export default function FeaturedTab({
    venue, plan, featuredCreditsRemaining = 0,
    onPurchaseOneOff, onSubscribeFeatured, onClaimCredit, onUpgrade,
}) {
    const [busy, setBusy] = useState(null);
    const isPlus      = plan?.key === 'pubPlus';
    const isPro       = plan?.key === 'pubPro';
    const isFeatured  = Boolean(venue?.featuredUntil && new Date(venue.featuredUntil?.toDate?.() || venue.featuredUntil) > new Date());

    const featuredExpiry = isFeatured
        ? new Date(venue.featuredUntil?.toDate?.() || venue.featuredUntil)
        : null;

    const run = async (key, fn) => {
        setBusy(key); try { await fn?.(); } finally { setBusy(null); }
    };

    return (
        <div className="space-y-6 animate-fadeIn" data-testid="featured-tab">
            <div>
                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Featured Listing</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                    Get to the top of city searches with a “Featured” badge
                </p>
            </div>

            {/* Status banner */}
            {isFeatured ? (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-800/40" data-testid="featured-active-banner">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">⭐ Featured</p>
                    <p className="text-base font-black text-gray-850 dark:text-white mt-1">
                        {venue.name} is featured until {featuredExpiry?.toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        You appear at the top of every search in <strong>{venue.location}</strong>.
                    </p>
                </div>
            ) : (
                <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-750/30 border border-gray-200 dark:border-gray-700" data-testid="featured-inactive-banner">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Not currently featured</p>
                    <p className="text-base font-black text-gray-850 dark:text-white mt-1">
                        Stand out from the crowd
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                        Pub Ranker venues with active featured listings see <strong>3-5× more profile
                        views</strong> in their local area in our pilots.
                    </p>
                </div>
            )}

            {/* Purchase options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                <FeaturedCard
                    title="One-off boost"
                    price="£49"
                    sub="30 days"
                    blurb="One payment, no subscription. Perfect for a launch, refurb reopen, or quiz-night season."
                    ctaLabel="Buy 30-day boost"
                    onClick={() => run('oneoff', onPurchaseOneOff)}
                    busy={busy === 'oneoff'}
                    testid="featured-oneoff"
                />
                <FeaturedCard
                    title="Monthly subscription"
                    price="£15"
                    sub="per month, rolling"
                    blurb="Always featured. Cancel anytime from your billing tab. Best price per day."
                    ctaLabel="Subscribe"
                    onClick={() => run('sub', onSubscribeFeatured)}
                    busy={busy === 'sub'}
                    highlight
                    testid="featured-monthly"
                />
                <div
                    data-testid="featured-credits-card"
                    className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3 relative overflow-hidden"
                >
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Pub Plus credits</p>
                    <p className="text-2xl font-black text-gray-850 dark:text-white">
                        {featuredCreditsRemaining} <span className="text-xs font-normal text-gray-400">remaining</span>
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        Pub Plus subscribers get <strong>2 free featured weeks</strong> per month.
                        Roll-over not supported.
                    </p>
                    <button
                        onClick={() => run('credit', onClaimCredit)}
                        disabled={!isPlus || featuredCreditsRemaining <= 0 || busy === 'credit'}
                        data-testid="featured-claim-credit"
                        className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                            isPlus && featuredCreditsRemaining > 0
                                ? 'bg-amber-500 text-white hover:opacity-85 cursor-pointer'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {busy === 'credit' ? 'Activating…' : 'Use 1 credit (7 days)'}
                    </button>

                    {!isPlus && (
                        <PremiumLock
                            requiredPlan="pubPlus"
                            icon="⭐"
                            title="Pub Plus exclusive"
                            body="Subscribers get 2 free featured weeks every month — plus the full competitor leaderboard and multi-venue dashboard."
                            onUpgrade={onUpgrade}
                        />
                    )}
                </div>
            </div>

            <p className="text-[10px] text-gray-400 leading-relaxed">
                {isPro && 'Pub Pro subscribers can buy featured listings as add-ons at the same price as free-tier pubs. '}
                Featured pubs are clearly labelled “Sponsored” per UK advertising rules.
                You can stack a one-off boost on top of a subscription to extend the period.
            </p>
        </div>
    );
}

function FeaturedCard({ title, price, sub, blurb, ctaLabel, onClick, busy, highlight, testid }) {
    return (
        <div
            data-testid={testid}
            className={`p-5 rounded-2xl border ${
                highlight ? 'border-brand bg-brand/5' : 'border-gray-200 dark:border-gray-700'
            } space-y-3`}
        >
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{title}</p>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-850 dark:text-white">{price}</span>
                <span className="text-xs text-gray-500">{sub}</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{blurb}</p>
            <button
                onClick={onClick}
                disabled={busy}
                className={`w-full py-2 rounded-xl text-xs font-bold transition ${
                    highlight
                        ? 'bg-brand text-white hover:opacity-85 cursor-pointer disabled:opacity-50'
                        : 'border border-gray-200 dark:border-gray-650 hover:bg-gray-50 dark:hover:bg-gray-750 dark:text-white cursor-pointer disabled:opacity-50'
                }`}
            >
                {busy ? 'Redirecting…' : ctaLabel}
            </button>
        </div>
    );
}
