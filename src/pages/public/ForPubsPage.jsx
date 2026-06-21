import { Link } from 'react-router-dom';
import PublicPageLayout from '../../components/PublicPageLayout';
import SEO from '../../components/SEO';

const BENEFITS = [
    {
        emoji: '📊',
        title: 'See what locals actually think',
        body: 'Unfiltered ratings across atmosphere, service, beer quality, price and the criteria your customers care about most — updated in real time.',
    },
    {
        emoji: '⚡',
        title: 'Fix the right things, fast',
        body: 'Spot weak criteria before they hit Google reviews. "Service is rated 0.6 below your nearest competitor" is the kind of insight that changes a Friday night.',
    },
    {
        emoji: '🏆',
        title: 'Show up first',
        body: 'Claim your listing, respond to reviews, and earn the verified-pub badge. Pub Plus venues also get featured-listing credits each month.',
    },
    {
        emoji: '📈',
        title: 'Benchmark against the street',
        body: 'See how you stack up vs the 5 nearest pubs on every metric. Monthly email recap so you never have to log in to know what changed.',
    },
];

const FAQ = [
    { q: 'How do I claim my pub?', a: 'Sign up, search for your pub, and click "Claim". We&apos;ll send a verification code to your registered business address (or run a quick £1 stripe verification charge that we refund). Most pubs are verified within 24 hours.' },
    { q: 'Is this just a review site?', a: 'No — Pub Ranker reviews are from real customer groups rating against shared criteria, not anonymous one-shots. You get sharper, more honest data than star-only platforms.' },
    { q: 'Do I have to respond to reviews?', a: 'Not at all. But Pub Pro and Pub Plus venues that respond see ~40% higher repeat-visit intent in our pilot.' },
    { q: 'What if a review is unfair or fake?', a: 'Every review is tied to a real, authenticated account in a group. You can flag any review and our team reviews flagged content within one business day.' },
    { q: 'Can I see aggregate data for my chain?', a: 'Yes — Pub Plus includes a multi-venue dashboard. For data licensing across whole portfolios, drop us a line via /contact.' },
];

export default function ForPubsPage({ onLoginClick }) {
    return (
        <PublicPageLayout onLoginClick={onLoginClick}>
            <SEO
                title="Pub Ranker for Pubs"
                description="Turn customer ratings into action. Claim your pub, respond to reviews, benchmark against neighbours, and get a monthly performance report. From £19/month."
                path="/for-pubs"
            />

            {/* Hero */}
            <section style={{
                padding: 'clamp(4rem, 9vw, 7rem) var(--space-6) clamp(3rem, 6vw, 5rem)',
                borderBottom: '1px solid var(--color-divider)',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ maxWidth: 1080, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                        backgroundColor: 'color-mix(in srgb, var(--color-brand) 12%, var(--color-bg))',
                        border: '1px solid color-mix(in srgb, var(--color-brand) 25%, transparent)',
                        color: 'var(--color-brand)',
                        borderRadius: 'var(--radius-full)',
                        padding: 'var(--space-1) var(--space-4)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 800,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: 'var(--space-6)',
                    }}>For Pubs &amp; Landlords</div>

                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
                        fontWeight: 900,
                        lineHeight: 1.02,
                        letterSpacing: '-0.02em',
                        marginBottom: 'var(--space-6)',
                        maxWidth: '18ch',
                    }}>
                        Your customers are already ranking you. <em style={{ color: 'var(--color-brand)', fontStyle: 'italic' }}>Now see what they say.</em>
                    </h1>

                    <p style={{
                        fontSize: 'var(--text-lg)',
                        color: 'var(--color-text-muted)',
                        maxWidth: '56ch',
                        lineHeight: 1.7,
                        marginBottom: 'var(--space-8)',
                    }}>
                        Honest, multi-criteria reviews from real groups of local punters. Get
                        the live review feed, respond publicly, and benchmark yourself against
                        the 5 nearest pubs — all for less than the cost of one keg a month.
                    </p>

                    <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <button
                            onClick={onLoginClick}
                            data-testid="forpubs-cta-signup"
                            className="btn-brand btn-brand-lg"
                            style={{ fontSize: 'var(--text-base)', padding: 'var(--space-4) var(--space-8)', borderRadius: 'var(--radius-full)' }}
                        >
                            Start free 14-day trial
                        </button>
                        <Link
                            to="/pricing"
                            data-testid="forpubs-cta-pricing"
                            style={{
                                background: 'none', border: '2px solid var(--color-border)',
                                cursor: 'pointer', fontSize: 'var(--text-base)', fontWeight: 700,
                                color: 'var(--color-text)', fontFamily: 'var(--font-body)',
                                padding: 'var(--space-4) var(--space-8)',
                                borderRadius: 'var(--radius-full)',
                                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                                transition: 'border-color 180ms',
                            }}
                        >See pricing →</Link>
                    </div>

                    <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontWeight: 600 }}>
                        No card up-front · Cancel anytime · UK pubs only (for now)
                    </p>
                </div>
            </section>

            {/* Benefits */}
            <section style={{ padding: 'clamp(3rem, 6vw, 5rem) var(--space-6)' }}>
                <div style={{ maxWidth: 1080, margin: '0 auto' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-8)',
                        maxWidth: '20ch',
                    }}>What you get with a verified pub listing</h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(260px, 100%), 1fr))',
                        gap: 'var(--space-6)',
                    }}>
                        {BENEFITS.map(b => (
                            <div key={b.title} className="card-warm" style={{ padding: 'var(--space-6)' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 'var(--space-3)' }}>{b.emoji}</div>
                                <h3 style={{
                                    fontFamily: 'var(--font-display)',
                                    fontSize: 'var(--text-lg)', fontWeight: 700,
                                    marginBottom: 'var(--space-2)',
                                }}>{b.title}</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
                                    {b.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Social-proof / stats band */}
            <section style={{
                padding: 'clamp(3rem, 5vw, 4rem) var(--space-6)',
                backgroundColor: 'var(--color-brand)',
                color: '#fff',
                textAlign: 'center',
            }}>
                <div style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: 'var(--space-6)' }}>
                    {[
                        { value: '14',  label: 'Day free trial' },
                        { value: '£19', label: 'Starting price / month' },
                        { value: '5',   label: 'Criteria rated' },
                        { value: '24h', label: 'Verification SLA' },
                    ].map(s => (
                        <div key={s.label}>
                            <div style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 'clamp(2rem, 5vw, 3rem)',
                                fontWeight: 900,
                                lineHeight: 1,
                            }}>{s.value}</div>
                            <p style={{
                                opacity: 0.85, marginTop: 4,
                                fontSize: 'var(--text-xs)', fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: '0.08em',
                            }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* FAQ */}
            <section style={{ padding: 'clamp(3rem, 6vw, 5rem) var(--space-6)' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.5rem, 3vw, 2.2rem)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-8)',
                        textAlign: 'center',
                    }}>Questions, answered</h2>
                    {FAQ.map((item, i) => (
                        <details
                            key={i}
                            data-testid={`forpubs-faq-${i}`}
                            style={{ borderBottom: '1px solid var(--color-divider)', padding: 'var(--space-4) 0' }}
                        >
                            <summary style={{
                                fontWeight: 700, fontSize: 'var(--text-base)', cursor: 'pointer',
                                listStyle: 'none', display: 'flex',
                                justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                {item.q}
                                <span aria-hidden="true" style={{ color: 'var(--color-brand)' }}>+</span>
                            </summary>
                            <p style={{ marginTop: 'var(--space-3)', color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
                                {item.a}
                            </p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Final CTA */}
            <section style={{ padding: 'clamp(3rem, 6vw, 5rem) var(--space-6)', borderTop: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)', textAlign: 'center' }}>
                <div style={{ maxWidth: 560, margin: '0 auto' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
                        fontWeight: 700,
                        marginBottom: 'var(--space-3)',
                    }}>14 days. No card. Real data.</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
                        Find out exactly what your locals think — before they post it on Google.
                    </p>
                    <button
                        onClick={onLoginClick}
                        data-testid="forpubs-cta-bottom"
                        className="btn-brand btn-brand-lg"
                        style={{ borderRadius: 'var(--radius-full)' }}
                    >Claim your pub free</button>
                </div>
            </section>
        </PublicPageLayout>
    );
}
