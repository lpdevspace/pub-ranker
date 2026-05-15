import { useState, useEffect } from 'react';
import PintGlassLogo from '../components/PintGlassLogo';

// ─── Inline SVG icons (no external dependency) ──────────────────────────────
const IconMap = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
        <circle cx="12" cy="9" r="2.5" />
    </svg>
);
const IconTrophy = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 21h8M12 17v4M7 4H4a2 2 0 0 0-2 2v2c0 2.76 2.02 5.07 4.68 5.47M17 4h3a2 2 0 0 1 2 2v2c0 2.76-2.02 5.07-4.68 5.47" />
        <path d="M7 4h10v8a5 5 0 0 1-10 0V4z" />
    </svg>
);
const IconStar = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);
const IconUsers = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);
const IconWheel = () => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
        <circle cx="12" cy="12" r="2" />
    </svg>
);

// ─── Decorative pint glass SVG for hero ─────────────────────────────────────
const HeroPintGlass = ({ opacity = 0.07 }) => (
    <svg viewBox="0 0 120 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%' }}>
        <path d="M25 10 L15 190 H105 L95 10 Z" fill="currentColor" opacity={opacity} />
        <path d="M25 10 L95 10" stroke="currentColor" strokeWidth="3" opacity={opacity * 2} />
        <rect x="15" y="10" width="90" height="30" rx="4" fill="currentColor" opacity={opacity * 1.5} />
        <path d="M20 45 Q60 55 100 45" stroke="currentColor" strokeWidth="2" fill="none" opacity={opacity * 2} />
    </svg>
);

export default function PublicLandingPage({ db, onLoginClick }) {
    const [publicGroups, setPublicGroups] = useState([]);
    const [searchCity, setSearchCity] = useState('');
    const [previewGroup, setPreviewGroup] = useState(null);
    const [previewPubs, setPreviewPubs] = useState([]);
    const [loadingPreview, setLoadingPreview] = useState(false);

    useEffect(() => {
        db.collection('groups')
            .where('isPublic', '==', true)
            .limit(20)
            .get()
            .then(snap =>
                setPublicGroups(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            )
            .catch(e => console.error('Error fetching public groups', e));
    }, [db]);

    const filteredGroups = publicGroups.filter(g =>
        !searchCity || (g.city && g.city.toLowerCase().includes(searchCity.toLowerCase()))
    );

    const handlePreview = async (group) => {
        setPreviewGroup(group);
        setLoadingPreview(true);
        try {
            const snap = await db.collection('groups').doc(group.id).collection('pubs').get();
            const fetchedPubs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            fetchedPubs.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
            setPreviewPubs(fetchedPubs.slice(0, 5));
        } catch (e) {
            console.error(e);
        }
        setLoadingPreview(false);
    };

    const features = [
        {
            icon: <IconStar />,
            title: 'Rate what matters',
            desc: 'Custom criteria — atmosphere, beer, service, price — weighted your way. Your group, your rules.',
            wide: true,
            accent: true,
        },
        {
            icon: <IconMap />,
            title: 'Map your regulars',
            desc: 'Pin every pub on an interactive map and plan the perfect crawl.',
            wide: false,
        },
        {
            icon: <IconTrophy />,
            title: 'Live leaderboard',
            desc: 'Scores update in real time. Always know who's the current champion local.',
            wide: false,
        },
        {
            icon: <IconUsers />,
            title: 'Invite your mates',
            desc: 'Private groups, member approval, and role-based permissions keep things tidy.',
            wide: false,
        },
        {
            icon: <IconWheel />,
            title: 'Spin the wheel',
            desc: "Can't decide where to go tonight? Let fate pick from your top-rated pubs.",
            wide: false,
        },
    ];

    const steps = [
        { num: '01', title: 'Create your group', desc: 'Sign up in seconds and invite your mates via link.' },
        { num: '02', title: 'Add your pubs', desc: 'Search or drop a pin — any pub in the UK can be added.' },
        { num: '03', title: 'Rate together', desc: 'Everyone scores on your criteria. Averages update live.' },
        { num: '04', title: 'Crown the winner', desc: 'Your definitive leaderboard. Settled. No more arguments.' },
    ];

    return (
        <div style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', overflowX: 'hidden' }}>

            {/* ─── Header ──────────────────────────────────────────────────── */}
            <header style={{
                borderBottom: '1px solid var(--color-divider)',
                position: 'sticky', top: 0, zIndex: 40,
                backgroundColor: 'var(--color-bg)',
                backdropFilter: 'blur(12px)',
            }}>
                <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 var(--space-6)', height: 60, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <PintGlassLogo size={32} />
                    <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                        <button
                            onClick={() => document.getElementById('explore-section')?.scrollIntoView({ behavior: 'smooth' })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', fontFamily: 'var(--font-body)', padding: 'var(--space-2) var(--space-3)' }}
                        >
                            Explore
                        </button>
                        <button onClick={onLoginClick} className="btn-brand">
                            Sign In
                        </button>
                    </div>
                </div>
            </header>

            {/* ─── Hero ────────────────────────────────────────────────────── */}
            <section style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--color-divider)' }}>

                {/* Decorative background — repeating pint glass silhouettes */}
                <div aria-hidden="true" style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(8, 1fr)',
                    opacity: 1,
                    pointerEvents: 'none',
                    color: 'var(--color-brand)',
                    overflow: 'hidden',
                }}>
                    {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} style={{ height: '100%', minHeight: 320, padding: 'var(--space-4)' }}>
                            <HeroPintGlass opacity={0.06 + (i % 3) * 0.015} />
                        </div>
                    ))}
                </div>

                {/* Gradient overlay so text stays readable */}
                <div aria-hidden="true" style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    background: 'linear-gradient(135deg, var(--color-bg) 45%, transparent 100%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 2, maxWidth: 1152, margin: '0 auto', padding: 'clamp(4rem, 10vw, 7rem) var(--space-6)' }}>
                    <div style={{ maxWidth: 640 }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                            backgroundColor: 'var(--color-brand-subtle, color-mix(in oklch, var(--color-brand) 12%, var(--color-bg)))',
                            border: '1px solid color-mix(in oklch, var(--color-brand) 25%, transparent)',
                            color: 'var(--color-brand)',
                            borderRadius: 'var(--radius-full)',
                            padding: 'var(--space-1) var(--space-4)',
                            fontSize: 'var(--text-xs)',
                            fontWeight: 800,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            marginBottom: 'var(--space-6)',
                        }}>
                            🍺 For you and your mates
                        </div>

                        <h1 style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
                            fontWeight: 900,
                            lineHeight: 1.02,
                            color: 'var(--color-text)',
                            marginBottom: 'var(--space-6)',
                            letterSpacing: '-0.02em',
                        }}>
                            Stop arguing.<br />
                            <em style={{ color: 'var(--color-brand)', fontStyle: 'italic' }}>Start ranking.</em>
                        </h1>

                        <p style={{
                            fontSize: 'var(--text-lg)',
                            color: 'var(--color-text-muted)',
                            maxWidth: '50ch',
                            marginBottom: 'var(--space-10)',
                            lineHeight: 1.7,
                        }}>
                            The app for you and your group to rate, rank, and map the best pubs in your city. No more forgetting which one you loved.
                        </p>

                        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                            <button
                                onClick={onLoginClick}
                                className="btn-brand btn-brand-lg"
                                style={{ fontSize: 'var(--text-base)', padding: 'var(--space-4) var(--space-8)', borderRadius: 'var(--radius-full)' }}
                            >
                                Create Your Free Group
                            </button>
                            <button
                                onClick={() => document.getElementById('explore-section')?.scrollIntoView({ behavior: 'smooth' })}
                                style={{
                                    background: 'none', border: '2px solid var(--color-border)', cursor: 'pointer',
                                    fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)',
                                    fontFamily: 'var(--font-body)', padding: 'var(--space-4) var(--space-8)',
                                    borderRadius: 'var(--radius-full)', transition: 'border-color 180ms, color 180ms',
                                }}
                            >
                                Browse Groups
                            </button>
                        </div>

                        {/* Social proof micro-line */}
                        <p style={{ marginTop: 'var(--space-6)', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', fontWeight: 600, letterSpacing: '0.04em' }}>
                            Free to use · No credit card · Works on mobile
                        </p>
                    </div>
                </div>
            </section>

            {/* ─── Stats ticker ────────────────────────────────────────────── */}
            <div style={{
                backgroundColor: 'var(--color-brand)',
                padding: 'var(--space-5) var(--space-6)',
                overflow: 'hidden',
            }}>
                <div style={{
                    maxWidth: 1152, margin: '0 auto',
                    display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap',
                    gap: 'var(--space-6)',
                }}>
                    {[
                        { value: 'Free', label: 'Always' },
                        { value: '∞', label: 'Pubs to rank' },
                        { value: '5', label: 'Rating criteria' },
                        { value: '🍺', label: 'Cold ones earned' },
                    ].map(stat => (
                        <div key={stat.label} style={{ textAlign: 'center', color: '#fff' }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 900, lineHeight: 1 }}>{stat.value}</div>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, opacity: 0.75, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-1)' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ─── Features bento ─────────────────────────────────────────── */}
            <section style={{
                backgroundColor: 'var(--color-surface)',
                borderTop: '1px solid var(--color-divider)',
                borderBottom: '1px solid var(--color-divider)',
                padding: 'clamp(3rem, 6vw, 5rem) 0',
            }}>
                <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 var(--space-6)' }}>
                    <div style={{ marginBottom: 'var(--space-10)', maxWidth: 480 }}>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>Everything you need</p>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, lineHeight: 1.1, color: 'var(--color-text)' }}>
                            One app. Every pub. Your verdict.
                        </h2>
                    </div>

                    {/* Bento grid */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))',
                        gap: 'var(--space-4)',
                    }}>
                        {/* Wide accent card */}
                        <div style={{
                            gridColumn: 'span 2',
                            backgroundColor: 'var(--color-brand)',
                            borderRadius: 'var(--radius-2xl)',
                            padding: 'var(--space-10) var(--space-10)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 'var(--space-8)', flexWrap: 'wrap',
                            minWidth: 0,
                        }}>
                            <div style={{ color: '#fff', maxWidth: '38ch' }}>
                                <div style={{ marginBottom: 'var(--space-4)', opacity: 0.9 }}><IconStar /></div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.3rem, 2.5vw, 1.9rem)', fontWeight: 900, marginBottom: 'var(--space-3)', lineHeight: 1.15 }}>
                                    Rate what matters to you
                                </h3>
                                <p style={{ fontSize: 'var(--text-sm)', opacity: 0.85, lineHeight: 1.7 }}>
                                    Set your own scoring criteria — atmosphere, beer quality, service, price. Weight them however you like. Your group, your rules.
                                </p>
                            </div>
                            <div style={{
                                background: 'rgba(255,255,255,0.15)',
                                borderRadius: 'var(--radius-xl)',
                                padding: 'var(--space-6) var(--space-8)',
                                textAlign: 'center', flexShrink: 0,
                                border: '1px solid rgba(255,255,255,0.2)',
                            }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '3.5rem', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>9.2</div>
                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'var(--space-2)' }}>Average Score</div>
                            </div>
                        </div>

                        {/* Remaining feature cards */}
                        {[
                            { icon: <IconMap />, title: 'Map your regulars', desc: 'Pin every pub. See your city's best spots at a glance and plan the perfect crawl.' },
                            { icon: <IconTrophy />, title: 'Live leaderboard', desc: 'Scores update in real time as your group rates. Always know the champion local.' },
                            { icon: <IconUsers />, title: 'Invite your mates', desc: 'Private groups with member approval and roles keep things between the right people.' },
                            { icon: <IconWheel />, title: 'Spin the wheel', desc: "Can't decide where to go tonight? Let fate choose from your top-rated locals." },
                        ].map(f => (
                            <div key={f.title} className="card-warm" style={{ padding: 'var(--space-8)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div style={{ color: 'var(--color-brand)', width: 44, height: 44, backgroundColor: 'color-mix(in oklch, var(--color-brand) 10%, var(--color-surface))', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {f.icon}
                                </div>
                                <div>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>{f.title}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── How it works ────────────────────────────────────────────── */}
            <section style={{ padding: 'clamp(3rem, 6vw, 5rem) 0' }}>
                <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 var(--space-6)' }}>
                    <div style={{ marginBottom: 'var(--space-10)', textAlign: 'center' }}>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>Up and running in minutes</p>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 3.5vw, 2.5rem)', fontWeight: 900, color: 'var(--color-text)' }}>How it works</h2>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))',
                        gap: 'var(--space-6)',
                    }}>
                        {steps.map((step, i) => (
                            <div key={step.num} style={{ position: 'relative', paddingTop: 'var(--space-2)' }}>
                                {/* Connector line */}
                                {i < steps.length - 1 && (
                                    <div aria-hidden="true" style={{
                                        display: 'none', // hidden on mobile, shown via media query below
                                        position: 'absolute',
                                        top: 22, left: 'calc(100% - var(--space-3))',
                                        width: 'var(--space-6)', height: 2,
                                        backgroundColor: 'var(--color-divider)',
                                        zIndex: 0,
                                    }} className="step-connector" />
                                )}
                                <div style={{
                                    width: 44, height: 44,
                                    borderRadius: 'var(--radius-full)',
                                    backgroundColor: 'var(--color-brand)',
                                    color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'var(--font-display)', fontWeight: 900,
                                    fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)',
                                    flexShrink: 0,
                                    position: 'relative', zIndex: 1,
                                }}>
                                    {step.num}
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                                    {step.title}
                                </h3>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.7 }}>{step.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─── Explore public groups ───────────────────────────────────── */}
            <section id="explore-section" style={{
                backgroundColor: 'var(--color-surface)',
                borderTop: '1px solid var(--color-divider)',
                borderBottom: '1px solid var(--color-divider)',
                padding: 'clamp(3rem, 6vw, 5rem) 0',
            }}>
                <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 var(--space-6)' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                        marginBottom: 'var(--space-8)', flexWrap: 'wrap', gap: 'var(--space-4)',
                    }}>
                        <div>
                            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 800, color: 'var(--color-brand)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>Live leaderboards</p>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem, 3vw, 2rem)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                                Explore Public Groups
                            </h2>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>See how other cities rank their locals</p>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by city…"
                            value={searchCity}
                            onChange={e => setSearchCity(e.target.value)}
                            style={{
                                padding: 'var(--space-3) var(--space-5)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'var(--color-surface-2)',
                                color: 'var(--color-text)',
                                fontSize: 'var(--text-sm)',
                                outline: 'none',
                                width: '100%', maxWidth: '240px',
                                boxShadow: 'var(--shadow-sm)',
                            }}
                        />
                    </div>

                    {filteredGroups.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: 'var(--space-16) var(--space-8)',
                            backgroundColor: 'var(--color-surface-2)',
                            borderRadius: 'var(--radius-2xl)',
                            border: '1px dashed var(--color-divider)',
                        }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>🍺</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                                {searchCity ? `No groups found in "${searchCity}"` : 'No public groups yet'}
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', maxWidth: '36ch', margin: '0 auto var(--space-6)' }}>
                                Be the first to put your city on the map.
                            </p>
                            <button onClick={onLoginClick} className="btn-brand">Start a Group</button>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
                            gap: 'var(--space-5)',
                        }}>
                            {filteredGroups.map(group => (
                                <div
                                    key={group.id}
                                    onClick={() => handlePreview(group)}
                                    className="card-warm"
                                    style={{ padding: 'var(--space-6)', cursor: 'pointer' }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)', overflow: 'hidden', backgroundColor: 'var(--color-surface-offset)', flexShrink: 0 }}>
                                            {group.coverPhoto
                                                ? <img src={group.coverPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Group cover" loading="lazy" />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🍺</div>
                                            }
                                        </div>
                                        <span style={{
                                            backgroundColor: 'color-mix(in oklch, var(--color-brand) 12%, var(--color-surface))',
                                            color: 'var(--color-brand)',
                                            padding: 'var(--space-1) var(--space-3)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 'var(--text-xs)', fontWeight: 800,
                                            textTransform: 'uppercase', letterSpacing: '0.07em',
                                        }}>Preview</span>
                                    </div>
                                    <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-1)', color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {group.groupName}
                                    </h4>
                                    <p style={{ color: 'var(--color-brand)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>
                                        📍 {group.city || 'Global'}
                                    </p>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-4)' }}>
                                        <div>
                                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 'var(--space-1)' }}>Members</div>
                                            <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>👥 {group.members?.length || 1}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 'var(--space-1)' }}>Pubs Ranked</div>
                                            <div style={{ fontSize: 'var(--text-base)', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>🍺 {group.pubCount || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* ─── CTA Banner ──────────────────────────────────────────────── */}
            <section style={{
                padding: 'clamp(3rem, 6vw, 5rem) 0',
                position: 'relative', overflow: 'hidden',
            }}>
                <div aria-hidden="true" style={{
                    position: 'absolute', inset: 0, zIndex: 0,
                    display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)',
                    opacity: 1, pointerEvents: 'none',
                    color: 'var(--color-brand)',
                }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{ padding: 'var(--space-4)' }}>
                            <HeroPintGlass opacity={0.05} />
                        </div>
                    ))}
                </div>
                <div aria-hidden="true" style={{
                    position: 'absolute', inset: 0, zIndex: 1,
                    background: 'linear-gradient(to right, var(--color-bg) 0%, transparent 40%, transparent 60%, var(--color-bg) 100%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 2, maxWidth: 640, margin: '0 auto', padding: '0 var(--space-6)', textAlign: 'center' }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                        fontWeight: 900, lineHeight: 1.1,
                        color: 'var(--color-text)',
                        marginBottom: 'var(--space-4)',
                    }}>
                        Ready to settle it once and for all?
                    </h2>
                    <p style={{ fontSize: 'var(--text-lg)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', lineHeight: 1.6 }}>
                        Create your free group, add your locals, and start rating tonight.
                    </p>
                    <button
                        onClick={onLoginClick}
                        className="btn-brand btn-brand-lg"
                        style={{ borderRadius: 'var(--radius-full)', fontSize: 'var(--text-base)', padding: 'var(--space-4) var(--space-10)' }}
                    >
                        Get Started — It's Free
                    </button>
                    <p style={{ marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>No credit card required</p>
                </div>
            </section>

            {/* ─── Footer ──────────────────────────────────────────────────── */}
            <footer style={{
                borderTop: '1px solid var(--color-divider)',
                padding: 'var(--space-8) var(--space-6)',
                textAlign: 'center',
                color: 'var(--color-text-faint)',
                fontSize: 'var(--text-xs)',
                backgroundColor: 'var(--color-surface)',
            }}>
                <PintGlassLogo size={20} showText={false} style={{ margin: '0 auto var(--space-3)', color: 'var(--color-text-faint)' }} />
                <p style={{ marginTop: 'var(--space-3)' }}>© {new Date().getFullYear()} Pub Ranker. Made with 🍺 in England.</p>
            </footer>

            {/* ─── Preview modal ───────────────────────────────────────────── */}
            {previewGroup && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 'var(--space-4)',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={e => { if (e.target === e.currentTarget) setPreviewGroup(null); }}
                >
                    <div style={{
                        backgroundColor: 'var(--color-surface)',
                        borderRadius: 'var(--radius-2xl)',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--color-border)',
                        padding: 'var(--space-8)',
                        maxWidth: '480px', width: '100%',
                        maxHeight: '90vh', overflowY: 'auto',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => setPreviewGroup(null)}
                            style={{
                                position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)',
                                background: 'var(--color-surface-offset)', border: 'none',
                                borderRadius: 'var(--radius-full)', width: 32, height: 32,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--color-text-muted)',
                                fontSize: '1rem',
                            }}
                            aria-label="Close preview"
                        >✕</button>

                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-1)', color: 'var(--color-text)', paddingRight: 'var(--space-8)' }}>
                            {previewGroup.groupName}
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
                            📍 {previewGroup.city} · Top 5 pubs
                        </p>

                        {loadingPreview ? (
                            <div style={{ textAlign: 'center', padding: 'var(--space-10)', color: 'var(--color-text-muted)' }}>
                                <div className="loader" style={{ margin: '0 auto var(--space-4)' }} />
                                Loading rankings…
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {previewPubs.length === 0 ? (
                                    <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-8) 0' }}>No pubs rated yet.</p>
                                ) : (
                                    previewPubs.map((pub, index) => (
                                        <div
                                            key={pub.id}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                                                backgroundColor: 'var(--color-surface-2)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: 'var(--radius-xl)',
                                                padding: 'var(--space-3) var(--space-4)',
                                            }}
                                        >
                                            <div style={{
                                                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                                                backgroundColor: index === 0 ? 'var(--color-brand)' : 'var(--color-surface-offset)',
                                                color: index === 0 ? '#fff' : 'var(--color-text-muted)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontWeight: 800, fontSize: 'var(--text-sm)', flexShrink: 0,
                                                fontVariantNumeric: 'tabular-nums',
                                            }}>{index + 1}</div>
                                            {pub.photoURL && (
                                                <img src={pub.photoURL} alt={pub.name} loading="lazy"
                                                    style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }} />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>{pub.name}</h4>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pub.location}</p>
                                            </div>
                                            {pub.avgScore != null && (
                                                <div className="score-badge" style={{
                                                    backgroundColor: pub.avgScore >= 8 ? 'var(--color-success-bg)' : pub.avgScore >= 6 ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
                                                    color: pub.avgScore >= 8 ? 'var(--color-success)' : pub.avgScore >= 6 ? 'var(--color-warning)' : 'var(--color-error)',
                                                }}>{pub.avgScore.toFixed(1)}</div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        <div style={{ marginTop: 'var(--space-8)', paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-divider)', textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
                                Want to see the full scores or challenge their rankings?
                            </p>
                            <button
                                onClick={() => { setPreviewGroup(null); onLoginClick(); }}
                                className="btn-brand"
                                style={{ width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-xl)', padding: 'var(--space-4)' }}
                            >
                                Sign Up to Join Group
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
