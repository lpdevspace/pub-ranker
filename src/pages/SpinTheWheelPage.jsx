import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';

const AVAILABLE_TAGS = [
    '🍺 Beer Garden', '🐕 Dog Friendly', '🎱 Pool Table',
    '📺 Live Sports', '🎵 Live Music', '🍔 Food Served',
    '🎯 Darts', '🍷 Cocktails', '🔥 Open Fire'
];

const WHEEL_COLORS = [
    '#b45309', '#d97706', '#92400e', '#f59e0b',
    '#78350f', '#fbbf24', '#a16207', '#fcd34d',
];

/* ── canvas draw ────────────────────────────────────────────────────────── */
function drawWheel(canvas, pubs, rotationDeg) {
    if (!canvas || pubs.length === 0) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2, cy = size / 2;
    const radius = cx - 6;
    const n = pubs.length;
    const sliceAngle = (Math.PI * 2) / n;
    const rotRad = (rotationDeg * Math.PI) / 180;

    // Scale font with slice size — more pubs = smaller text
    const slicePx = (2 * Math.PI * radius) / n;          // arc length per slice
    const fontSize = Math.max(10, Math.min(18, Math.floor(slicePx * 0.18)));

    ctx.clearRect(0, 0, size, size);

    // Outer glow shadow
    ctx.save();
    ctx.shadowColor = 'rgba(180, 83, 9, 0.4)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'transparent';
    ctx.fill();
    ctx.restore();

    pubs.forEach((pub, i) => {
        const startAngle = rotRad + i * sliceAngle;
        const endAngle   = startAngle + sliceAngle;

        // Slice fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length];
        ctx.fill();

        // Inner highlight shimmer
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.restore();

        // Divider stroke
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // ── Label: radial (outward from centre) ──
        // Place text at ~60% of radius along the slice midpoint angle.
        // Rotate so text reads outward — i.e. rotate by midAngle so the
        // text baseline points away from centre. Then flip 180° for the
        // bottom half so text is never upside-down.
        const midAngle = startAngle + sliceAngle / 2;
        const textR = radius * 0.60;
        const tx = cx + Math.cos(midAngle) * textR;
        const ty = cy + Math.sin(midAngle) * textR;

        // Max chars scales with available arc width
        const arcWidth = slicePx * 0.55;    // usable arc in pixels
        const charW = fontSize * 0.62;       // approx char width
        const maxChars = Math.max(4, Math.floor(arcWidth / charW));
        let label = pub.name;
        if (label.length > maxChars) label = label.substring(0, maxChars - 1) + '…';

        ctx.save();
        ctx.translate(tx, ty);

        // Radial outward: text reads from centre outward.
        // For slices in the bottom half (midAngle > PI) flip 180° so text
        // is never rendered upside-down.
        const isBottom = Math.cos(midAngle) < 0;
        ctx.rotate(midAngle + (isBottom ? Math.PI : 0));

        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${fontSize}px 'Satoshi', system-ui, sans-serif`;
        ctx.textAlign = isBottom ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 4;

        // Offset slightly outward from the pivot point
        const offset = isBottom ? -4 : 4;
        ctx.fillText(label, offset, 0);
        ctx.restore();
    });

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Centre hub
    ctx.beginPath();
    ctx.arc(cx, cy, 30, 0, Math.PI * 2);
    const hubGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, 30);
    hubGrad.addColorStop(0, '#fef3c7');
    hubGrad.addColorStop(1, '#fde68a');
    ctx.fillStyle = hubGrad;
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = '16px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent';
    ctx.fillText('🍺', cx, cy);
}

/* ── component ──────────────────────────────────────────────────────────── */
export default function SpinTheWheelPage({ pubs, newPubs, criteria, scores }) {
    const allPubs = useMemo(() => [
        ...(Array.isArray(pubs)    ? pubs    : Object.values(pubs    || {})).map(p => ({ ...p, _listType: 'visited'  })),
        ...(Array.isArray(newPubs) ? newPubs : Object.values(newPubs || {})).map(p => ({ ...p, _listType: 'toVisit' })),
    ], [pubs, newPubs]);

    const [filteredPubs,   setFilteredPubs]   = useState([]);
    const [isSpinning,     setIsSpinning]     = useState(false);
    const [spinResult,     setSpinResult]     = useState(null);
    const [includeVisited, setIncludeVisited] = useState(true);
    const [includeToVisit, setIncludeToVisit] = useState(true);
    const [criterionId,    setCriterionId]    = useState('');
    const [tagFilter,      setTagFilter]      = useState('');
    const [rotation,       setRotation]       = useState(0);
    const [showResult,     setShowResult]     = useState(false);

    const cssRotRef = useRef(0);
    const [cssRot,      setCssRot]      = useState(0);
    const [cssSpinning, setCssSpinning] = useState(false);
    const canvasRef = useRef(null);

    const criteriaArray = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const yesNoCriteria = criteriaArray.filter(c => c.type === 'yes-no');

    const pubScoreMap = useMemo(() => {
        const map = {};
        allPubs.forEach(pub => {
            let total = 0, weight = 0;
            Object.values(scores?.[pub.id] ?? {}).forEach(cArr =>
                (cArr || []).forEach(s => {
                    if (s.type === 'scale' && s.value != null) { total += s.value; weight += 1; }
                })
            );
            map[pub.id] = weight > 0 ? { score: total / weight, hasScore: true } : { score: 0, hasScore: false };
        });
        return map;
    }, [allPubs, scores]);

    useEffect(() => {
        let result = allPubs.filter(pub => {
            const isVisited = pub._listType === 'visited';
            return (includeVisited && isVisited) || (includeToVisit && !isVisited);
        });
        if (criterionId) result = result.filter(pub =>
            scores?.[pub.id]?.[criterionId]?.some(s => s.value === true)
        );
        if (tagFilter) result = result.filter(pub =>
            Array.isArray(pub.tags) && pub.tags.includes(tagFilter)
        );
        setFilteredPubs(result);
        setSpinResult(null);
        setShowResult(false);
    }, [allPubs, scores, includeVisited, includeToVisit, criterionId, tagFilter]);

    useEffect(() => {
        drawWheel(canvasRef.current, filteredPubs, rotation);
    }, [filteredPubs, rotation]);

    const handleSpin = () => {
        if (isSpinning || filteredPubs.length === 0) return;
        setIsSpinning(true);
        setCssSpinning(true);
        setSpinResult(null);
        setShowResult(false);

        const n = filteredPubs.length;
        const winIdx = Math.floor(Math.random() * n);
        const sliceDeg = 360 / n;
        const sliceCenter = winIdx * sliceDeg + sliceDeg / 2;
        const currentMod = cssRotRef.current % 360;
        let needed = ((270 - sliceCenter) - currentMod + 360) % 360;
        if (needed < 30) needed += 360;
        const jitter = (Math.random() - 0.5) * sliceDeg * 0.6;
        const totalSpin = 360 * 7 + needed + jitter;

        const newCss = cssRotRef.current + totalSpin;
        cssRotRef.current = newCss;
        setCssRot(newCss);

        setTimeout(() => {
            const settled = ((newCss % 360) + 360) % 360;
            setRotation(settled);
            setCssSpinning(false);
            setIsSpinning(false);
            setSpinResult(filteredPubs[winIdx]);
            setTimeout(() => setShowResult(true), 100);
            confetti({
                particleCount: 200,
                spread: 100,
                origin: { y: 0.5 },
                colors: ['#b45309', '#d97706', '#fbbf24', '#fde68a', '#ffffff'],
            });
        }, 4100);
    };

    const pubCount = filteredPubs.length;
    const { score: resultScore, hasScore: resultHasScore } = spinResult
        ? (pubScoreMap[spinResult.id] || { score: 0, hasScore: false })
        : { score: 0, hasScore: false };

    return (
        // ── Full-width wrapper — no maxWidth cap ──
        <div style={{ width: '100%', padding: 'var(--space-6) var(--space-6) var(--space-16)' }}>
            <style>{`
                @keyframes wheelGlow {
                    0%,100% { box-shadow: 0 0 30px 6px rgba(180,83,9,0.25), 0 0 60px 12px rgba(180,83,9,0.10); }
                    50%     { box-shadow: 0 0 50px 14px rgba(180,83,9,0.45), 0 0 90px 22px rgba(180,83,9,0.18); }
                }
                @keyframes spinGlow {
                    0%,100% { box-shadow: 0 0 40px 10px rgba(245,158,11,0.5), 0 0 80px 24px rgba(245,158,11,0.25); }
                    50%     { box-shadow: 0 0 70px 20px rgba(245,158,11,0.75), 0 0 120px 40px rgba(245,158,11,0.35); }
                }
                @keyframes pointerBounce {
                    0%,100% { transform: translateY(0); }
                    50%     { transform: translateY(-5px); }
                }
                @keyframes resultSlideUp {
                    from { opacity:0; transform:translateY(24px) scale(0.97); }
                    to   { opacity:1; transform:translateY(0) scale(1); }
                }
                @keyframes pulse {
                    0%,100% { opacity:1; } 50% { opacity:0.6; }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position:  200% center; }
                }
                .spin-glow        { animation: wheelGlow 3s ease-in-out infinite; }
                .spin-glow-active { animation: spinGlow 0.6s ease-in-out infinite; }
                .pointer-idle     { animation: pointerBounce 2s ease-in-out infinite; }
                .pointer-active   { animation: pointerBounce 0.3s ease-in-out infinite; }
                .result-card      { animation: resultSlideUp 0.5s cubic-bezier(0.16,1,0.3,1) both; }
                .spinning-text    { animation: pulse 0.8s ease-in-out infinite; }
                .shimmer-btn {
                    background: linear-gradient(90deg, var(--color-brand) 0%, #fbbf24 40%, var(--color-brand) 80%);
                    background-size: 200% auto;
                    animation: shimmer 2s linear infinite;
                }
            `}</style>

            {/* ── Two-column layout on wide screens ── */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
                gridTemplateRows: 'auto',
                gap: 'var(--space-6)',
                alignItems: 'start',
            }}>

                {/* ── LEFT COLUMN: hero + filters + result ── */}
                <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-5)' }}>

                    {/* Hero */}
                    <div className="grain-overlay" style={{
                        background: 'linear-gradient(135deg, var(--color-brand-active) 0%, var(--color-brand) 50%, #d97706 100%)',
                        borderRadius: 'var(--radius-2xl)',
                        padding: 'var(--space-8) var(--space-8) var(--space-10)',
                        textAlign: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{ position:'absolute', top:'-2rem', right:'-2rem', width:'10rem', height:'10rem', borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
                        <div style={{ position:'absolute', bottom:'-3rem', left:'-2rem', width:'14rem', height:'14rem', borderRadius:'50%', background:'rgba(0,0,0,0.08)', pointerEvents:'none' }} />

                        <p style={{ fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)', letterSpacing:'0.14em', textTransform:'uppercase', color:'rgba(255,255,255,0.7)', marginBottom:'var(--space-2)' }}>
                            🍻 Pub Ranker
                        </p>
                        <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(2rem, 3vw, 3rem)', fontWeight:400, color:'#ffffff', lineHeight:1.1, marginBottom:'var(--space-3)', textShadow:'0 2px 12px rgba(0,0,0,0.25)' }}>
                            Spin the Wheel
                        </h2>
                        <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'rgba(255,255,255,0.8)', maxWidth:'36ch', margin:'0 auto' }}>
                            Can't decide where to go? Let fate pick your local for the night.
                        </p>
                        <div style={{ display:'inline-flex', alignItems:'center', gap:'var(--space-2)', marginTop:'var(--space-5)', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'var(--radius-full)', padding:'var(--space-2) var(--space-4)', backdropFilter:'blur(4px)' }}>
                            <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: pubCount > 0 ? '#4ade80' : '#f87171', flexShrink:0 }} />
                            <span style={{ fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)', color:'rgba(255,255,255,0.95)' }}>
                                {pubCount === 0 ? 'No pubs in pool' : `${pubCount} pub${pubCount === 1 ? '' : 's'} in the mix`}
                            </span>
                        </div>
                    </div>

                    {/* Filters */}
                    <div style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-2xl)', padding:'var(--space-5) var(--space-6)', boxShadow:'var(--shadow-sm)' }}>
                        <p className="text-label" style={{ marginBottom:'var(--space-4)' }}>Customise Your Pool</p>
                        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>

                            <div>
                                <p style={{ fontFamily:'var(--font-body)', fontWeight:600, fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginBottom:'var(--space-2)' }}>Include</p>
                                <div style={{ display:'flex', gap:'var(--space-2)' }}>
                                    {[
                                        { key:'visited', label:'✅ Visited',  state:includeVisited, set:setIncludeVisited },
                                        { key:'toVisit', label:'🎯 Hit List', state:includeToVisit, set:setIncludeToVisit },
                                    ].map(({ key, label, state, set }) => (
                                        <button key={key} onClick={() => set(v => !v)} style={{
                                            flex: 1,
                                            padding: 'var(--space-2) var(--space-3)',
                                            borderRadius: 'var(--radius-lg)',
                                            border: `2px solid ${state ? 'var(--color-brand)' : 'var(--color-border)'}`,
                                            background: state ? 'var(--color-brand-subtle)' : 'transparent',
                                            color: state ? 'var(--color-brand)' : 'var(--color-text-muted)',
                                            fontFamily: 'var(--font-body)',
                                            fontWeight: 700,
                                            fontSize: 'var(--text-xs)',
                                            cursor: 'pointer',
                                            transition: 'all var(--transition)',
                                        }}>{label}</button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <p style={{ fontFamily:'var(--font-body)', fontWeight:600, fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginBottom:'var(--space-2)' }}>Rating criterion</p>
                                <select value={criterionId} onChange={e => setCriterionId(e.target.value)} style={{ width:'100%', padding:'var(--space-2) var(--space-3)', border:'1.5px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'var(--color-surface-2)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontWeight:600, fontSize:'var(--text-xs)', cursor:'pointer', outline:'none' }}>
                                    <option value="">All pubs</option>
                                    {yesNoCriteria.map(c => <option key={c.id} value={c.id}>Must have: {c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <p style={{ fontFamily:'var(--font-body)', fontWeight:600, fontSize:'var(--text-xs)', color:'var(--color-text-muted)', marginBottom:'var(--space-2)' }}>Amenity</p>
                                <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ width:'100%', padding:'var(--space-2) var(--space-3)', border:'1.5px solid var(--color-border)', borderRadius:'var(--radius-lg)', background:'var(--color-surface-2)', color:'var(--color-text)', fontFamily:'var(--font-body)', fontWeight:600, fontSize:'var(--text-xs)', cursor:'pointer', outline:'none' }}>
                                    <option value="">Any amenity</option>
                                    {AVAILABLE_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Result card */}
                    {spinResult && !isSpinning && showResult && (() => {
                        const scoreVal  = resultScore;
                        const hasScore  = resultHasScore;
                        const tierColor = !hasScore ? '#9ca3af'
                            : scoreVal >= 8.5 ? '#b46414'
                            : scoreVal >= 7   ? '#d4a017'
                            : scoreVal >= 5   ? '#ca8a04'
                            : '#dc2626';
                        const tierLabel = !hasScore ? 'Unrated'
                            : scoreVal >= 8.5 ? '🏆 Legendary'
                            : scoreVal >= 7   ? '⭐ Great'
                            : scoreVal >= 5   ? '👍 Decent'
                            : '⚠️ Avoid';

                        return (
                            <div className="result-card grain-overlay" style={{ borderRadius:'var(--radius-2xl)', overflow:'hidden', border:`2px solid ${tierColor}`, boxShadow:`0 8px 32px ${tierColor}40, var(--shadow-lg)` }}>
                                {spinResult.photoURL ? (
                                    <img src={spinResult.photoURL} alt={spinResult.name} loading="lazy" width="600" height="220" style={{ width:'100%', height:'12rem', objectFit:'cover', display:'block' }} />
                                ) : (
                                    <div style={{ height:'8rem', background:`linear-gradient(135deg, ${tierColor}cc 0%, ${tierColor}66 100%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3.5rem' }}>🍻</div>
                                )}
                                <div style={{ padding:'var(--space-6) var(--space-7) var(--space-7)', background:'var(--color-surface)' }}>
                                    <p style={{ fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)', letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--color-brand)', marginBottom:'var(--space-2)' }}>🎉 Tonight's Pub Is…</p>
                                    <h3 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.6rem,2.5vw,2.4rem)', fontWeight:400, color:'var(--color-text)', lineHeight:1.1, marginBottom:'var(--space-3)' }}>{spinResult.name}</h3>
                                    <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-3)', alignItems:'center', marginBottom:'var(--space-4)' }}>
                                        {spinResult.location && (
                                            <span style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-sm)', color:'var(--color-text-muted)', display:'flex', alignItems:'center', gap:'var(--space-1)' }}>📍 {spinResult.location}</span>
                                        )}
                                        {hasScore && (
                                            <span style={{ background:tierColor, color:'#fff', borderRadius:'var(--radius-full)', padding:'var(--space-1) var(--space-4)', fontFamily:'var(--font-body)', fontWeight:800, fontSize:'var(--text-sm)' }}>{scoreVal.toFixed(1)}/10</span>
                                        )}
                                        <span style={{ background:`${tierColor}22`, color:tierColor, border:`1px solid ${tierColor}55`, borderRadius:'var(--radius-full)', padding:'var(--space-1) var(--space-3)', fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)' }}>{tierLabel}</span>
                                        {spinResult._listType === 'toVisit' && (
                                            <span style={{ background:'var(--color-warning-bg)', color:'var(--color-warning)', border:'1px solid var(--color-warning)', borderRadius:'var(--radius-full)', padding:'var(--space-1) var(--space-3)', fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-xs)' }}>📋 On your hit list</span>
                                        )}
                                    </div>
                                    {(spinResult.tags || []).length > 0 && (
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-2)', marginBottom:'var(--space-5)' }}>
                                            {spinResult.tags.slice(0, 5).map(tag => (
                                                <span key={tag} style={{ background:'var(--color-surface-2)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-full)', padding:'var(--space-1) var(--space-3)', fontFamily:'var(--font-body)', fontWeight:600, fontSize:'var(--text-xs)', color:'var(--color-text-muted)' }}>{tag}</span>
                                            ))}
                                        </div>
                                    )}
                                    <div style={{ display:'flex', gap:'var(--space-3)', flexWrap:'wrap' }}>
                                        <button onClick={handleSpin} className="btn-brand">🔄 Spin Again</button>
                                        {spinResult.googleLink && (
                                            <a href={spinResult.googleLink} target="_blank" rel="noopener noreferrer" className="btn-ghost">📍 Google Maps</a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* ── RIGHT COLUMN: wheel ── */}
                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-2xl)',
                    padding: 'var(--space-8) var(--space-6)',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--space-6)',
                    position: 'sticky',
                    top: 'var(--space-6)',
                    overflow: 'hidden',
                }}>
                    {/* Radial bg tint */}
                    <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%, color-mix(in oklch, var(--color-brand) 8%, transparent) 0%, transparent 70%)', pointerEvents:'none' }} />

                    {/* Pointer */}
                    <div
                        className={isSpinning ? 'pointer-active' : 'pointer-idle'}
                        style={{ position:'relative', zIndex:2, fontSize:'2.2rem', lineHeight:1, filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.3))', userSelect:'none' }}
                    >
                        ▼
                    </div>

                    {/* Wheel canvas */}
                    <div
                        className={isSpinning ? 'spin-glow-active' : 'spin-glow'}
                        style={{ borderRadius:'50%', marginTop:'-1rem', position:'relative', zIndex:1, width:'min(520px, 44vw)', height:'min(520px, 44vw)' }}
                    >
                        {pubCount > 0 ? (
                            <canvas
                                ref={canvasRef}
                                width={520}
                                height={520}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    display: 'block',
                                    transform: `rotate(${cssRot}deg)`,
                                    transition: cssSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                                }}
                            />
                        ) : (
                            <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'var(--color-surface-2)', border:'3px dashed var(--color-border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'var(--space-3)' }}>
                                <span style={{ fontSize:'2.5rem' }}>🍺</span>
                                <p style={{ fontFamily:'var(--font-body)', fontWeight:700, fontSize:'var(--text-sm)', color:'var(--color-text-muted)', textAlign:'center', padding:'0 var(--space-8)' }}>No pubs match your filters</p>
                            </div>
                        )}
                    </div>

                    {/* Spin button */}
                    <button
                        onClick={handleSpin}
                        disabled={isSpinning || pubCount === 0}
                        className={isSpinning ? 'shimmer-btn' : ''}
                        style={{
                            position: 'relative', zIndex: 2,
                            width: '100%', maxWidth: '320px',
                            padding: 'var(--space-4) var(--space-8)',
                            borderRadius: 'var(--radius-full)',
                            border: 'none',
                            background: !isSpinning && pubCount > 0 ? 'var(--color-brand)' : undefined,
                            backgroundColor: pubCount === 0 ? 'var(--color-surface-offset)' : undefined,
                            color: pubCount === 0 ? 'var(--color-text-faint)' : '#fff',
                            fontFamily: 'var(--font-body)',
                            fontWeight: 900,
                            fontSize: 'var(--text-lg)',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            cursor: isSpinning || pubCount === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: pubCount > 0 && !isSpinning ? '0 8px 24px rgba(180,83,9,0.4), 0 2px 6px rgba(0,0,0,0.2)' : 'none',
                            transition: 'transform 120ms ease, box-shadow 120ms ease',
                        }}
                        onMouseEnter={e => { if (!isSpinning && pubCount > 0) { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(180,83,9,0.55), 0 4px 10px rgba(0,0,0,0.25)'; } }}
                        onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow= pubCount > 0 && !isSpinning ? '0 8px 24px rgba(180,83,9,0.4), 0 2px 6px rgba(0,0,0,0.2)' : 'none'; }}
                        onMouseDown={e  => { if (!isSpinning && pubCount > 0) e.currentTarget.style.transform='translateY(1px)'; }}
                        onMouseUp={e    => { if (!isSpinning && pubCount > 0) e.currentTarget.style.transform='translateY(-2px)'; }}
                    >
                        {isSpinning
                            ? <span className="spinning-text">Spinning…</span>
                            : pubCount === 0 ? 'No Pubs!'
                            : '🍺 SPIN!'}
                    </button>

                    {isSpinning && (
                        <p style={{ fontFamily:'var(--font-body)', fontSize:'var(--text-xs)', color:'var(--color-text-muted)', fontWeight:600, letterSpacing:'0.05em', marginTop:'calc(-1 * var(--space-3))' }}>
                            The wheel decides your fate…
                        </p>
                    )}
                </div>

            </div>{/* end grid */}
        </div>
    );
}
