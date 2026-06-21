import { useState } from 'react';
import PublicPageLayout from '../../components/PublicPageLayout';
import SEO from '../../components/SEO';
import { TIERS, STRIPE_ENABLED } from '../../utils/stripeConfig';
import { startCheckout } from '../../utils/checkout';

const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const CrossIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

function TierCard({ tier, billing, onCta, user }) {
    const isYearly = billing === 'yearly';
    const price = isYearly ? tier.priceYearly : tier.priceMonthly;
    const isFree = price === 0;
    const isB2B  = tier.audience === 'b2b';

    return (
        <div
            data-testid={`pricing-tier-${tier.key}`}
            style={{
                backgroundColor: tier.highlight ? 'var(--color-brand)' : 'var(--color-surface)',
                color: tier.highlight ? '#fff' : 'var(--color-text)',
                border: tier.highlight ? '1px solid color-mix(in srgb, var(--color-brand) 90%, #000)' : '1px solid var(--color-border)',
                borderRadius: 'var(--radius-2xl)',
                padding: 'var(--space-8) var(--space-6)',
                boxShadow: tier.highlight ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
                transition: 'transform 220ms ease, box-shadow 220ms ease',
            }}
        >
            {tier.highlight && (
                <span style={{
                    position: 'absolute', top: -12, right: 24,
                    background: '#fff',
                    color: 'var(--color-brand)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full)',
                    boxShadow: 'var(--shadow-sm)',
                }}>{tier.audience === 'b2b' ? 'Best value' : 'Most popular'}</span>
            )}

            <p style={{
                fontSize: 'var(--text-xs)', fontWeight: 800,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: tier.highlight ? 'rgba(255,255,255,0.85)' : 'var(--color-brand)',
                marginBottom: 'var(--space-2)',
            }}>{isB2B ? 'For Pubs' : 'For Drinkers'}</p>

            <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-xl)',
                fontWeight: 700,
                lineHeight: 1.1,
                marginBottom: 'var(--space-2)',
                color: tier.highlight ? '#fff' : 'var(--color-text)',
            }}>{tier.name}</h3>

            <p style={{
                fontSize: 'var(--text-sm)',
                color: tier.highlight ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)',
                marginBottom: 'var(--space-6)',
            }}>{tier.tagline}</p>

            <div style={{ marginBottom: 'var(--space-6)' }}>
                <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: tier.highlight ? '#fff' : 'var(--color-text)',
                }}>
                    {isFree ? 'Free' : `£${price}`}
                </span>
                {!isFree && (
                    <span style={{
                        marginLeft: 8,
                        fontSize: 'var(--text-sm)',
                        color: tier.highlight ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)',
                        fontWeight: 600,
                    }}>
                        / {isYearly ? 'year' : 'month'}
                    </span>
                )}
            </div>

            <button
                data-testid={`pricing-tier-${tier.key}-cta`}
                onClick={onCta}
                className={tier.highlight ? '' : 'btn-brand'}
                style={tier.highlight ? {
                    backgroundColor: '#fff',
                    color: 'var(--color-brand)',
                    fontWeight: 800,
                    border: 'none',
                    padding: 'var(--space-3) var(--space-6)',
                    borderRadius: 'var(--radius-full)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    marginBottom: 'var(--space-6)',
                    transition: 'transform 180ms, box-shadow 180ms',
                    boxShadow: 'var(--shadow-sm)',
                } : {
                    marginBottom: 'var(--space-6)',
                }}
            >
                {user && tier.key === 'free' ? 'You\'re on this' : tier.cta}
            </button>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {tier.features.map(f => (
                    <li key={f} style={{
                        display: 'flex', alignItems: 'flex-start',
                        gap: 'var(--space-2)',
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.5,
                        color: tier.highlight ? 'rgba(255,255,255,0.95)' : 'var(--color-text)',
                    }}>
                        <span style={{
                            color: tier.highlight ? '#fff' : 'var(--color-brand)',
                            marginTop: 3, flexShrink: 0,
                        }}><CheckIcon /></span>
                        {f}
                    </li>
                ))}
                {(tier.featuresMissing || []).map(f => (
                    <li key={f} style={{
                        display: 'flex', alignItems: 'flex-start',
                        gap: 'var(--space-2)',
                        fontSize: 'var(--text-sm)',
                        lineHeight: 1.5,
                        color: 'var(--color-text-faint)',
                        textDecoration: 'line-through',
                    }}>
                        <span style={{ color: 'var(--color-text-faint)', marginTop: 3, flexShrink: 0 }}><CrossIcon /></span>
                        {f}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ComingSoonModal({ tier, onClose }) {
    return (
        <div
            data-testid="checkout-coming-soon-modal"
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 100,
                backgroundColor: 'rgba(0,0,0,0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'var(--space-4)',
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    backgroundColor: 'var(--color-surface)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: 'var(--space-8)',
                    maxWidth: 440,
                    width: '100%',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-3)' }}>🚧</div>
                <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    marginBottom: 'var(--space-3)',
                }}>
                    {tier?.name} — checkout coming soon
                </h3>
                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
                    Stripe payments aren&apos;t configured on this environment yet. The full
                    upgrade flow will go live shortly. In the meantime you can use the free
                    tier and we&apos;ll let you know when {tier?.name} opens up.
                </p>
                <button
                    onClick={onClose}
                    data-testid="checkout-coming-soon-close"
                    className="btn-brand"
                    style={{ width: '100%', justifyContent: 'center' }}
                >Got it</button>
            </div>
        </div>
    );
}

export default function PricingPage({ onLoginClick, user, userProfile }) {
    const [billing, setBilling] = useState('monthly');
    const [unavailableTier, setUnavailableTier] = useState(null);
    const tiers = [TIERS.free, TIERS.premium, TIERS.pubPro, TIERS.pubPlus];

    const handleCta = (tier) => {
        if (tier.key === 'free') {
            onLoginClick?.();
            return;
        }
        const priceKey =
            tier.key === 'premium'  ? (billing === 'yearly' ? 'premiumYearly' : 'premiumMonthly') :
            tier.key === 'pubPro'   ? 'pubProMonthly' :
            tier.key === 'pubPlus'  ? 'pubPlusMonthly' : null;
        if (!priceKey) return;
        startCheckout(priceKey, {
            user, userProfile,
            onUnavailable: () => setUnavailableTier(tier),
        });
    };

    return (
        <PublicPageLayout onLoginClick={onLoginClick}>
            <SEO
                title="Pricing"
                description="Pub Ranker is free forever for groups of mates. Upgrade for ad-free, advanced filters, and exclusive perks. Plans for pubs from £19/month."
                path="/pricing"
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: 'Pub Ranker',
                    description: 'Pub rating & ranking app for groups',
                    offers: [
                        { '@type': 'Offer', name: 'Free Pint',  price: '0',     priceCurrency: 'GBP' },
                        { '@type': 'Offer', name: 'PubRanker+', price: '2.99',  priceCurrency: 'GBP' },
                        { '@type': 'Offer', name: 'Pub Pro',    price: '19.00', priceCurrency: 'GBP' },
                        { '@type': 'Offer', name: 'Pub Plus',   price: '49.00', priceCurrency: 'GBP' },
                    ],
                }}
            />

            <section style={{ padding: 'clamp(3rem, 6vw, 5rem) var(--space-6) var(--space-8)' }}>
                <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
                    <p style={{
                        fontSize: 'var(--text-xs)', fontWeight: 800,
                        color: 'var(--color-brand)', textTransform: 'uppercase',
                        letterSpacing: '0.1em', marginBottom: 'var(--space-2)',
                    }}>Pricing</p>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                        fontWeight: 900, lineHeight: 1.05,
                        marginBottom: 'var(--space-4)',
                        letterSpacing: '-0.02em',
                    }}>
                        Free for mates. <em style={{ color: 'var(--color-brand)', fontStyle: 'italic' }}>Powerful for pubs.</em>
                    </h1>
                    <p style={{
                        fontSize: 'var(--text-lg)',
                        color: 'var(--color-text-muted)',
                        maxWidth: '52ch',
                        margin: '0 auto var(--space-8)',
                        lineHeight: 1.6,
                    }}>
                        Start free. Upgrade when you want extras. Pubs unlock real-time
                        review analytics from £19/month.
                    </p>

                    {/* Billing toggle */}
                    <div
                        role="tablist"
                        aria-label="Billing period"
                        style={{
                            display: 'inline-flex',
                            backgroundColor: 'var(--color-surface)',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-full)',
                            padding: 4,
                            marginBottom: 'var(--space-10)',
                        }}
                    >
                        {[
                            { id: 'monthly', label: 'Monthly' },
                            { id: 'yearly',  label: 'Yearly · save 47%' },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                role="tab"
                                aria-selected={billing === opt.id}
                                data-testid={`billing-toggle-${opt.id}`}
                                onClick={() => setBilling(opt.id)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: 'var(--radius-full)',
                                    border: 'none', cursor: 'pointer',
                                    fontSize: 'var(--text-sm)', fontWeight: 700,
                                    backgroundColor: billing === opt.id ? 'var(--color-brand)' : 'transparent',
                                    color:           billing === opt.id ? '#fff' : 'var(--color-text-muted)',
                                    transition: 'all 180ms',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >{opt.label}</button>
                        ))}
                    </div>
                </div>

                <div style={{
                    maxWidth: 1200, margin: '0 auto',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
                    gap: 'var(--space-6)',
                    alignItems: 'stretch',
                }}>
                    {tiers.map(t => (
                        <TierCard
                            key={t.key}
                            tier={t}
                            billing={billing}
                            user={user}
                            onCta={() => handleCta(t)}
                        />
                    ))}
                </div>

                {!STRIPE_ENABLED && (
                    <p
                        data-testid="pricing-stripe-unconfigured-banner"
                        style={{
                            maxWidth: 720, margin: 'var(--space-10) auto 0',
                            padding: 'var(--space-4)',
                            backgroundColor: 'var(--color-warning-bg)',
                            color: 'var(--color-warning)',
                            border: '1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)',
                            borderRadius: 'var(--radius-lg)',
                            fontSize: 'var(--text-sm)',
                            textAlign: 'center',
                        }}
                    >
                        💳 Stripe checkout is in <strong>preview mode</strong>. Wire up your
                        Stripe keys to start collecting subscriptions — see
                        <code style={{ margin: '0 4px', padding: '2px 6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4 }}>src/utils/stripeConfig.js</code>
                        for setup instructions.
                    </p>
                )}
            </section>

            {/* FAQ */}
            <section style={{
                padding: 'clamp(2rem, 5vw, 4rem) var(--space-6)',
                backgroundColor: 'var(--color-surface)',
                borderTop: '1px solid var(--color-divider)',
            }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                        fontWeight: 700, lineHeight: 1.15,
                        marginBottom: 'var(--space-8)',
                        textAlign: 'center',
                    }}>Pricing questions</h2>
                    {[
                        { q: 'Is the free tier really free forever?', a: 'Yes. Up to three groups, unlimited pubs, full rating + leaderboard features — free, no credit card.' },
                        { q: 'What payment methods do you accept?',   a: 'All major debit/credit cards via Stripe. Subscriptions are billed monthly or annually and you can cancel any time from your account page.' },
                        { q: 'How does the Pub Pro free trial work?', a: 'Pubs get 14 days free with full access. You won&apos;t be charged until the trial ends, and we&apos;ll email you 3 days before.' },
                        { q: 'Can I switch tiers later?',             a: 'Of course — upgrade or downgrade from your profile page. Prorated automatically.' },
                        { q: 'Do you offer discounts for charities?', a: 'Yes — drop us a line via /contact and we&apos;ll sort you out.' },
                    ].map((item, i) => (
                        <details
                            key={i}
                            data-testid={`pricing-faq-${i}`}
                            style={{
                                borderBottom: '1px solid var(--color-divider)',
                                padding: 'var(--space-4) 0',
                            }}
                        >
                            <summary style={{
                                fontWeight: 700, fontSize: 'var(--text-base)',
                                cursor: 'pointer', listStyle: 'none',
                                display: 'flex', justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                                {item.q}
                                <span aria-hidden="true" style={{ color: 'var(--color-brand)' }}>+</span>
                            </summary>
                            <p style={{
                                marginTop: 'var(--space-3)',
                                color: 'var(--color-text-muted)',
                                lineHeight: 1.7,
                                fontSize: 'var(--text-sm)',
                            }}>{item.a}</p>
                        </details>
                    ))}
                </div>
            </section>

            {unavailableTier && (
                <ComingSoonModal
                    tier={unavailableTier}
                    onClose={() => setUnavailableTier(null)}
                />
            )}
        </PublicPageLayout>
    );
}
