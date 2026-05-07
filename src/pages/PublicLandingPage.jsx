import { useState, useEffect } from 'react';
import PintGlassLogo from '../components/PintGlassLogo';

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

    return (
        <div
            className="min-h-screen"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-body)' }}
        >
            {/* ─── Header ─── */}
            <header style={{ borderBottom: '1px solid var(--color-divider)' }}>
                <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
                    <PintGlassLogo size={32} />
                    <button onClick={onLoginClick} className="btn-brand">
                        Sign In
                    </button>
                </div>
            </header>

            {/* ─── Hero ─── */}
            <section className="grain-overlay max-w-6xl mx-auto px-6 py-20 md:py-28">
                <div className="max-w-3xl">
                    <p
                        style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 700,
                            color: 'var(--color-brand)',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        For you and your mates
                    </p>
                    <h1
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'clamp(2.5rem, 6vw, 5rem)',
                            fontWeight: 900,
                            lineHeight: 1.05,
                            color: 'var(--color-text)',
                            marginBottom: 'var(--space-6)',
                        }}
                    >
                        Stop arguing.<br />
                        <em style={{ color: 'var(--color-brand)', fontStyle: 'italic' }}>Start ranking.</em>
                    </h1>
                    <p
                        style={{
                            fontSize: 'var(--text-lg)',
                            color: 'var(--color-text-muted)',
                            maxWidth: '54ch',
                            marginBottom: 'var(--space-10)',
                            lineHeight: 1.7,
                        }}
                    >
                        The platform for you and your group to rate, rank, and map out the best pubs in your city. No more forgetting which one you loved.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button onClick={onLoginClick} className="btn-brand btn-brand-lg">
                            Create Your Free Group
                        </button>
                        <button
                            onClick={() => document.getElementById('explore-section')?.scrollIntoView({ behavior: 'smooth' })}
                            className="btn-ghost"
                            style={{ fontSize: 'var(--text-base)', padding: 'var(--space-4) var(--space-8)' }}
                        >
                            Browse Public Groups
                        </button>
                    </div>
                </div>
            </section>

            {/* ─── Feature highlights (asymmetric layout) ─── */}
            <section
                style={{
                    backgroundColor: 'var(--color-surface)',
                    borderTop: '1px solid var(--color-divider)',
                    borderBottom: '1px solid var(--color-divider)',
                    padding: 'clamp(3rem, 6vw, 5rem) 0',
                }}
            >
                <div className="max-w-6xl mx-auto px-6">
                    {/* Large pull-quote feature */}
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                            gap: 'var(--space-6)',
                            marginBottom: 'var(--space-6)',
                        }}
                    >
                        {/* Full-width callout card */}
                        <div
                            style={{
                                gridColumn: '1 / -1',
                                backgroundColor: 'var(--color-brand)',
                                borderRadius: 'var(--radius-2xl)',
                                padding: 'var(--space-10) var(--space-12)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 'var(--space-8)',
                                flexWrap: 'wrap',
                            }}
                        >
                            <div>
                                <h2
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                                        fontWeight: 900,
                                        color: '#fff',
                                        marginBottom: 'var(--space-3)',
                                    }}
                                >
                                    Rate what matters to you
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.85)', maxWidth: '48ch', lineHeight: 1.7, fontSize: 'var(--text-base)' }}>
                                    Custom scoring criteria — atmosphere, beer quality, service, price — weighted your way. Your group, your rules.
                                </p>
                            </div>
                            <div
                                style={{
                                    background: 'rgba(255,255,255,0.15)',
                                    borderRadius: 'var(--radius-xl)',
                                    padding: 'var(--space-6) var(--space-8)',
                                    textAlign: 'center',
                                    minWidth: '140px',
                                    flexShrink: 0,
                                }}
                            >
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>9.2</div>
                                <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Average Score</div>
                            </div>
                        </div>

                        {/* Two smaller feature cards */}
                        <div className="card-warm" style={{ padding: 'var(--space-8)' }}>
                            <div style={{ fontSize: '1.75rem', marginBottom: 'var(--space-4)' }}>🗺️</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
                                Map your regulars
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
                                Pin every pub on an interactive map. See your city's best spots at a glance and plan the perfect crawl.
                            </p>
                        </div>

                        <div className="card-warm" style={{ padding: 'var(--space-8)' }}>
                            <div style={{ fontSize: '1.75rem', marginBottom: 'var(--space-4)' }}>🏆</div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
                                Live leaderboard
                            </h3>
                            <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
                                Scores update in real time as your group rates. Always know who's the current champion local.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─── Explore public groups ─── */}
            <section id="explore-section" className="max-w-6xl mx-auto px-6 py-16">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 'var(--space-8)',
                        flexWrap: 'wrap',
                        gap: 'var(--space-4)',
                    }}
                >
                    <div>
                        <h2
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 'var(--text-xl)',
                                fontWeight: 700,
                                color: 'var(--color-text)',
                                marginBottom: 'var(--space-1)',
                            }}
                        >
                            Explore Public Leaderboards
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>See how other cities are ranking their locals</p>
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
                            backgroundColor: 'var(--color-surface)',
                            color: 'var(--color-text)',
                            fontSize: 'var(--text-sm)',
                            outline: 'none',
                            width: '100%',
                            maxWidth: '240px',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                    />
                </div>

                {filteredGroups.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: 'var(--space-16) var(--space-8)',
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: 'var(--radius-2xl)',
                            border: '1px dashed var(--color-divider)',
                        }}
                    >
                        <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>🍺</div>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                            {searchCity ? `No groups found in "${searchCity}"` : 'No public groups yet'}
                        </h3>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', maxWidth: '36ch', margin: '0 auto var(--space-6)' }}>
                            Be the first to put your city on the map.
                        </p>
                        <button onClick={onLoginClick} className="btn-brand">
                            Start a Group
                        </button>
                    </div>
                ) : (
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
                            gap: 'var(--space-5)',
                        }}
                    >
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
                                    <span
                                        style={{
                                            backgroundColor: 'var(--color-brand-subtle)',
                                            color: 'var(--color-brand)',
                                            padding: 'var(--space-1) var(--space-3)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 'var(--text-xs)',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.07em',
                                        }}
                                    >
                                        Preview
                                    </span>
                                </div>

                                <h4
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontSize: 'var(--text-lg)',
                                        fontWeight: 700,
                                        marginBottom: 'var(--space-1)',
                                        color: 'var(--color-text)',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {group.groupName}
                                </h4>
                                <p
                                    style={{
                                        color: 'var(--color-brand)',
                                        fontSize: 'var(--text-xs)',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.08em',
                                        marginBottom: 'var(--space-4)',
                                    }}
                                >
                                    📍 {group.city || 'Global'}
                                </p>

                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: 'var(--space-2)',
                                        borderTop: '1px solid var(--color-divider)',
                                        paddingTop: 'var(--space-4)',
                                    }}
                                >
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
            </section>

            {/* ─── Footer ─── */}
            <footer
                style={{
                    borderTop: '1px solid var(--color-divider)',
                    padding: 'var(--space-8) var(--space-6)',
                    textAlign: 'center',
                    color: 'var(--color-text-faint)',
                    fontSize: 'var(--text-xs)',
                }}
            >
                <PintGlassLogo size={20} showText={false} style={{ margin: '0 auto var(--space-3)', color: 'var(--color-text-faint)' }} />
                <p style={{ marginTop: 'var(--space-3)' }}>© {new Date().getFullYear()} Pub Ranker. Made with 🍺 in England.</p>
            </footer>

            {/* ─── Preview modal ─── */}
            {previewGroup && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 'var(--space-4)',
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={(e) => { if (e.target === e.currentTarget) setPreviewGroup(null); }}
                >
                    <div
                        style={{
                            backgroundColor: 'var(--color-surface)',
                            borderRadius: 'var(--radius-2xl)',
                            boxShadow: 'var(--shadow-lg)',
                            border: '1px solid var(--color-border)',
                            padding: 'var(--space-8)',
                            maxWidth: '480px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            position: 'relative',
                        }}
                    >
                        <button
                            onClick={() => setPreviewGroup(null)}
                            style={{
                                position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)',
                                background: 'var(--color-surface-offset)', border: 'none',
                                borderRadius: 'var(--radius-full)', width: 32, height: 32,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', color: 'var(--color-text-muted)',
                                fontSize: '1rem', transition: 'background var(--transition)',
                            }}
                            aria-label="Close preview"
                        >
                            ✕
                        </button>

                        <h3
                            style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: 'var(--text-xl)',
                                fontWeight: 700,
                                marginBottom: 'var(--space-1)',
                                color: 'var(--color-text)',
                                paddingRight: 'var(--space-8)',
                            }}
                        >
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
                                    <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-8) 0' }}>
                                        No pubs rated yet.
                                    </p>
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
                                            <div
                                                style={{
                                                    width: 32, height: 32,
                                                    borderRadius: 'var(--radius-md)',
                                                    backgroundColor: index === 0 ? 'var(--color-brand)' : 'var(--color-surface-offset)',
                                                    color: index === 0 ? '#fff' : 'var(--color-text-muted)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontWeight: 800, fontSize: 'var(--text-sm)',
                                                    flexShrink: 0,
                                                    fontVariantNumeric: 'tabular-nums',
                                                }}
                                            >
                                                {index + 1}
                                            </div>
                                            {pub.photoURL && (
                                                <img
                                                    src={pub.photoURL}
                                                    alt={pub.name}
                                                    loading="lazy"
                                                    style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', objectFit: 'cover', flexShrink: 0 }}
                                                />
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <h4 style={{ fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--text-sm)' }}>
                                                    {pub.name}
                                                </h4>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {pub.location}
                                                </p>
                                            </div>
                                            {pub.avgScore != null && (
                                                <div
                                                    className="score-badge"
                                                    style={{
                                                        backgroundColor: pub.avgScore >= 8 ? 'var(--color-success-bg)' : pub.avgScore >= 6 ? 'var(--color-warning-bg)' : 'var(--color-error-bg)',
                                                        color: pub.avgScore >= 8 ? 'var(--color-success)' : pub.avgScore >= 6 ? 'var(--color-warning)' : 'var(--color-error)',
                                                    }}
                                                >
                                                    {pub.avgScore.toFixed(1)}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        <div
                            style={{
                                marginTop: 'var(--space-8)',
                                paddingTop: 'var(--space-6)',
                                borderTop: '1px solid var(--color-divider)',
                                textAlign: 'center',
                            }}
                        >
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
