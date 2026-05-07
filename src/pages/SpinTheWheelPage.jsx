import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

const AVAILABLE_TAGS = [
    '🍺 Beer Garden', '🐕 Dog Friendly', '🎱 Pool Table', 
    '📺 Live Sports', '🎵 Live Music', '🍔 Food Served',
    '🎯 Darts', '🍷 Cocktails', '🔥 Open Fire'
];

export default function SpinTheWheelPage({ pubs, criteria, scores }) {
    const [filteredPubs, setFilteredPubs] = useState([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState(null);
    const [includeVisited, setIncludeVisited] = useState(true);
    const [includeToVisit, setIncludeToVisit] = useState(true);
    
    // Filters
    const [criterionId, setCriterionId] = useState('');
    const [tagFilter, setTagFilter] = useState('');
    
    const [rotation, setRotation] = useState(0); 
    const canvasRef = useRef(null);

    const yesNoCriteria = criteria.filter(c => c.type === 'yes-no');

    useEffect(() => {
        let result = pubs.filter(pub => {
            const isVisited = pub.status === 'visited';
            const isToVisit = pub.status !== 'visited';
            return (includeVisited && isVisited) || (includeToVisit && isToVisit);
        });

        if (criterionId) {
            result = result.filter(pub => {
                const pubScores = scores[pub.id];
                const criterionScores = pubScores?.[criterionId];
                return criterionScores?.some(s => s.value === true);
            });
        }

        if (tagFilter) {
            result = result.filter(pub => Array.isArray(pub.tags) && pub.tags.includes(tagFilter));
        }

        setFilteredPubs(result);
    }, [pubs, scores, criteria, includeVisited, includeToVisit, criterionId, tagFilter]);

    useEffect(() => {
        if (!canvasRef.current || filteredPubs.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2 - 10;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sliceAngle = (Math.PI * 2) / filteredPubs.length;
        const colors = ['#b45309', '#d97706', '#f59e0b', '#92400e', '#fbbf24', '#78350f', '#fcd34d'];

        filteredPubs.forEach((pub, i) => {
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i % colors.length];
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 4;
            ctx.stroke();

            const midAngle = startAngle + sliceAngle / 2;
            const textRadius = radius * 0.65;
            const textX = centerX + Math.cos(midAngle) * textRadius;
            const textY = centerY + Math.sin(midAngle) * textRadius;

            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(midAngle);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let label = pub.name;
            if (label.length > 16) label = label.substring(0, 15) + '...';
            
            ctx.fillText(label, 0, 0);
            ctx.restore();
        });

        ctx.beginPath();
        ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#1F2937';
        ctx.stroke();

        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 20px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🍻', centerX, centerY);

    }, [filteredPubs]);

    const handleSpin = () => {
        if (isSpinning || filteredPubs.length === 0) return;
        
        setIsSpinning(true);
        setSpinResult(null);

        const numSlices = filteredPubs.length;
        const winningIndex = Math.floor(Math.random() * numSlices);
        
        const sliceCenterDeg = (winningIndex + 0.5) * (360 / numSlices);
        const targetRotation = 270 - sliceCenterDeg;
        
        const currentMod = rotation % 360;
        let targetMod = targetRotation % 360;
        if (targetMod < 0) targetMod += 360;
        
        let diff = targetMod - currentMod;
        if (diff < 0) diff += 360;
        
        const sliceHalf = (360 / numSlices) / 2;
        const randomOffset = (Math.random() * sliceHalf) - (sliceHalf / 2);
        
        const newRotation = rotation + (360 * 5) + diff + randomOffset;
        setRotation(newRotation);

        setTimeout(() => {
            setSpinResult(filteredPubs[winningIndex]);
            setIsSpinning(false);
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }, 4000);
    };

    return (
        <div className="space-y-8 max-w-2xl mx-auto animate-fadeIn py-8">
            <div className="text-center">
                <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-2">Spin the Wheel</h2>
                <p className="text-gray-500 dark:text-gray-400">Can't decide where to go? Let fate decide.</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <p className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Pool of Pubs</p>
                        <div className="flex flex-col xl:flex-row gap-3">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${includeVisited ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                <input type="checkbox" checked={includeVisited} onChange={() => setIncludeVisited(!includeVisited)} className="hidden" />
                                <span className="font-bold text-sm">✅ Visited</span>
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${includeToVisit ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                <input type="checkbox" checked={includeToVisit} onChange={() => setIncludeToVisit(!includeToVisit)} className="hidden" />
                                <span className="font-bold text-sm">🎯 Hit List</span>
                            </label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="block font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Rating Filter</label>
                        <select value={criterionId} onChange={e => setCriterionId(e.target.value)} className="w-full px-4 py-3 font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer">
                            <option value="">No Filter (Include All)</option>
                            {yesNoCriteria.map(c => <option key={c.id} value={c.id}>Must have: {c.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-3">
                        <label className="block font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Amenities Filter</label>
                        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="w-full px-4 py-3 font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-amber-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer">
                            <option value="">No Filter (Include All)</option>
                            {AVAILABLE_TAGS.map(tag => <option key={tag} value={tag}>Must have: {tag}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center overflow-hidden">
                <div className="relative w-full max-w-[450px] aspect-square mb-8 mt-4">
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10 text-4xl drop-shadow-md">▼</div>
                    {filteredPubs.length > 0 ? (
                        <canvas
                            ref={canvasRef}
                            width={450}
                            height={450}
                            className="w-full h-full rounded-full shadow-2xl"
                            style={{ transform: `rotate(${rotation}deg)`, transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none' }}
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
                    {isSpinning ? 'Spinning...' : filteredPubs.length === 0 ? 'No Pubs!' : '🍺 SPIN!'}
                </button>

                {spinResult && !isSpinning && (
                    <div className="mt-8 text-center animate-bounce-in p-6 bg-amber-50 dark:bg-amber-900/30 rounded-2xl border-2 border-amber-300 dark:border-amber-700 w-full max-w-sm">
                        <p className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-2">Tonight's Pub Is...</p>
                        <h3 className="text-5xl font-black text-amber-600 dark:text-amber-400 mb-2 drop-shadow-sm">{spinResult?.name}</h3>
                        {spinResult?.location && <p className="text-gray-500 dark:text-gray-400">📍 {spinResult.location}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
