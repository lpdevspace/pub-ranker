import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';

const AVAILABLE_TAGS = [
    '🍺 Beer Garden', '🐕 Dog Friendly', '🎱 Pool Table',
    '📺 Live Sports', '🎵 Live Music', '🍔 Food Served',
    '🎯 Darts', '🍷 Cocktails', '🔥 Open Fire'
];

const WHEEL_COLORS = ['#b45309','#d97706','#f59e0b','#92400e','#fbbf24','#78350f','#fcd34d'];

function drawWheel(canvas, pubs, rotationDeg) {
    if (!canvas || pubs.length === 0) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 10;
    const n = pubs.length;
    const sliceAngle = (Math.PI * 2) / n;
    // Convert current rotation to radians so text always reads correctly
    const rotRad = (rotationDeg * Math.PI) / 180;

    ctx.clearRect(0, 0, size, size);

    // Dynamic font size: shrink when there are many slices
    const fontSize = Math.max(9, Math.min(18, Math.floor(radius * 0.13)));

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
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Text — draw horizontal so it's always readable
        const midAngle = startAngle + sliceAngle / 2;
        const textR = radius * 0.62;
        const tx = cx + Math.cos(midAngle) * textR;
        const ty = cy + Math.sin(midAngle) * textR;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(midAngle + Math.PI / 2); // align along the slice
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        let label = pub.name;
        // Max chars scales with slice size
        const maxChars = Math.max(6, Math.floor(14 - n * 0.3));
        if (label.length > maxChars) label = label.substring(0, maxChars - 1) + '\u2026';

        // Shadow for legibility
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 3;
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });

    // Centre hub
    ctx.beginPath();
    ctx.arc(cx, cy, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1F2937';
    ctx.stroke();

    ctx.font = 'bold 18px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#1F2937';
    ctx.fillText('\uD83C\uDF7B', cx, cy);
}

export default function SpinTheWheelPage({ pubs, newPubs, criteria, scores }) {
    // Merge both lists, tagging each with its origin
    const allPubs = useMemo(() => [
        ...(Array.isArray(pubs)    ? pubs    : Object.values(pubs    || {})).map(p => ({ ...p, _listType: 'visited'  })),
        ...(Array.isArray(newPubs) ? newPubs : Object.values(newPubs || {})).map(p => ({ ...p, _listType: 'toVisit' })),
    ], [pubs, newPubs]);

    const [filteredPubs, setFilteredPubs] = useState([]);
    const [isSpinning,   setIsSpinning]   = useState(false);
    const [spinResult,   setSpinResult]   = useState(null);
    const [includeVisited,  setIncludeVisited]  = useState(true);
    const [includeToVisit,  setIncludeToVisit]  = useState(true);
    const [criterionId, setCriterionId] = useState('');
    const [tagFilter,   setTagFilter]   = useState('');
    // rotation stored as normalised 0-359 degrees
    const [rotation, setRotation] = useState(0);
    // accumulated CSS rotation (unbounded) so the CSS transition works smoothly
    const cssRotationRef = useRef(0);
    const [cssRotation,  setCssRotation]  = useState(0);
    const [spinning,     setSpinning]     = useState(false); // CSS spinning flag

    const canvasRef = useRef(null);

    const criteriaArray  = Array.isArray(criteria) ? criteria : Object.values(criteria || {});
    const yesNoCriteria  = criteriaArray.filter(c => c.type === 'yes-no');

    // --- filter pubs --------------------------------------------------------
    useEffect(() => {
        let result = allPubs.filter(pub => {
            const isVisited = pub._listType === 'visited';
            return (includeVisited && isVisited) || (includeToVisit && !isVisited);
        });

        if (criterionId) {
            result = result.filter(pub => {
                const cScores = scores?.[pub.id]?.[criterionId];
                return cScores?.some(s => s.value === true);
            });
        }

        if (tagFilter) {
            result = result.filter(pub => Array.isArray(pub.tags) && pub.tags.includes(tagFilter));
        }

        setFilteredPubs(result);
        setSpinResult(null);
    }, [allPubs, scores, includeVisited, includeToVisit, criterionId, tagFilter]);

    // --- redraw wheel whenever pubs or rotation changes --------------------
    useEffect(() => {
        drawWheel(canvasRef.current, filteredPubs, rotation);
    }, [filteredPubs, rotation]);

    // --- spin ---------------------------------------------------------------
    const handleSpin = () => {
        if (isSpinning || filteredPubs.length === 0) return;

        setIsSpinning(true);
        setSpinning(true);
        setSpinResult(null);

        const n = filteredPubs.length;
        const winningIndex = Math.floor(Math.random() * n);
        const sliceDeg = 360 / n;
        // The pointer sits at the top (270° in standard math coords).
        // We want the centre of the winning slice to land at 270°.
        const sliceCenterDeg = winningIndex * sliceDeg + sliceDeg / 2;
        // How far we need to rotate beyond the current position
        const currentMod = cssRotationRef.current % 360;
        let needed = ((270 - sliceCenterDeg) - currentMod + 360) % 360;
        if (needed < 10) needed += 360; // ensure at least one full extra pass
        // Add random jitter within ±half-slice so it doesn't always land dead-centre
        const jitter = (Math.random() - 0.5) * sliceDeg * 0.7;
        const totalSpin = 360 * 6 + needed + jitter;

        const newCss = cssRotationRef.current + totalSpin;
        cssRotationRef.current = newCss;
        setCssRotation(newCss);

        // After CSS transition (4s) settle: update the logical rotation and redraw
        setTimeout(() => {
            const settled = newCss % 360;
            setRotation(settled < 0 ? settled + 360 : settled);
            setSpinning(false);
            setIsSpinning(false);
            setSpinResult(filteredPubs[winningIndex]);
            confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 } });
        }, 4100);
    };

    // -----------------------------------------------------------------------
    return (
        <div className="space-y-8 max-w-2xl mx-auto animate-fadeIn py-8">
            <div className="text-center">
                <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-2">Spin the Wheel</h2>
                <p className="text-gray-500 dark:text-gray-400">Can&apos;t decide where to go? Let fate decide.</p>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <p className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Pool of Pubs</p>
                        <div className="flex flex-col xl:flex-row gap-3">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                includeVisited
                                    ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}>
                                <input type="checkbox" checked={includeVisited} onChange={() => setIncludeVisited(v => !v)} className="hidden" />
                                <span className="font-bold text-sm">✅ Visited</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                includeToVisit
                                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}>
                                <input type="checkbox" checked={includeToVisit} onChange={() => setIncludeToVisit(v => !v)} className="hidden" />
                                <span className="font-bold text-sm">🎯 Hit List</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Rating Filter</label>
                        <select
                            value={criterionId}
                            onChange={e => setCriterionId(e.target.value)}
                            className="w-full px-4 py-3 font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer"
                        >
                            <option value="">No Filter (Include All)</option>
                            {yesNoCriteria.map(c => <option key={c.id} value={c.id}>Must have: {c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="block font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Amenities Filter</label>
                        <select
                            value={tagFilter}
                            onChange={e => setTagFilter(e.target.value)}
                            className="w-full px-4 py-3 font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer"
                        >
                            <option value="">No Filter (Include All)</option>
                            {AVAILABLE_TAGS.map(tag => <option key={tag} value={tag}>Must have: {tag}</option>)}
                        </select>
                    </div>
                </div>
                <p className="mt-4 text-center text-sm text-gray-400">
                    {filteredPubs.length === 0
                        ? 'No pubs match your filters.'
                        : `${filteredPubs.length} pub${filteredPubs.length === 1 ? '' : 's'} in the mix`}
                </p>
            </div>

            {/* Wheel */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center overflow-hidden">
                <div className="relative w-full max-w-[450px] aspect-square mb-8 mt-4">
                    {/* Pointer */}
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-10 text-4xl drop-shadow-md select-none">▼</div>

                    {filteredPubs.length > 0 ? (
                        <canvas
                            ref={canvasRef}
                            width={450}
                            height={450}
                            className="w-full h-full rounded-full shadow-2xl"
                            style={{
                                transform: `rotate(${cssRotation}deg)`,
                                transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                            }}
                        />
                    ) : (
                        <div className="w-full h-full rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            <p className="text-gray-400 font-bold text-center px-8">No pubs match your filters!</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleSpin}
                    disabled={isSpinning || filteredPubs.length === 0}
                    className="w-full max-w-sm bg-amber-600 text-white py-4 rounded-xl font-black text-2xl uppercase tracking-widest hover:bg-amber-700 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl shadow-amber-500/30"
                >
                    {isSpinning ? 'Spinning\u2026' : filteredPubs.length === 0 ? 'No Pubs!' : '\uD83C\uDF7A SPIN!'}
                </button>

                {spinResult && !isSpinning && (
                    <div className="mt-8 text-center animate-bounce-in p-6 bg-amber-50 dark:bg-amber-900/30 rounded-2xl border-2 border-amber-300 dark:border-amber-700 w-full max-w-sm">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Tonight&apos;s Pub Is...</p>
                        <h3 className="text-4xl font-black text-amber-600 dark:text-amber-400 mb-2 drop-shadow-sm">{spinResult.name}</h3>
                        {spinResult.location && <p className="text-gray-500 dark:text-gray-400">📍 {spinResult.location}</p>}
                        {spinResult._listType === 'toVisit' && (
                            <p className="mt-2 text-xs font-bold text-orange-500 uppercase tracking-wider">📋 On your hit list</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
