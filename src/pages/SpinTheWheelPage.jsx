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
    const [tagFilter, setTagFilter] = useState(''); // <-- NEW TAG FILTER
    
    const [rotation, setRotation] = useState(0); 
    const canvasRef = useRef(null);

    const yesNoCriteria = criteria.filter(c => c.type === 'yes-no');

    // --- FILTER LOGIC (UPDATED WITH TAGS) ---
    useEffect(() => {
        // 1. Filter by Status (Visited / Hit List)
        let result = pubs.filter(pub => {
            const isVisited = pub.status === 'visited';
            const isToVisit = pub.status !== 'visited';
            return (includeVisited && isVisited) || (includeToVisit && isToVisit);
        });

        // 2. Filter by Rating (Yes/No Criteria)
        if (criterionId) {
            result = result.filter(pub => {
                const pubScores = scores[pub.id];
                const criterionScores = pubScores?.[criterionId];
                return criterionScores?.some(s => s.value === true);
            });
        }

        // 3. Filter by Amenities (Tags)
        if (tagFilter) {
            result = result.filter(pub => {
                return Array.isArray(pub.tags) && pub.tags.includes(tagFilter);
            });
        }

        setFilteredPubs(result);
    }, [pubs, scores, criteria, includeVisited, includeToVisit, criterionId, tagFilter]);

    // --- DRAW THE WHEEL ---
    useEffect(() => {
        if (!canvasRef.current || filteredPubs.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2 - 10;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sliceAngle = (Math.PI * 2) / filteredPubs.length;
        const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981', '#06B6D4'];

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
        <div className="space-y-8 max-w-5xl mx-auto animate-fadeIn">
            <div className="text-center">
                <h2 className="text-4xl font-black text-gray-800 dark:text-white mb-2 transition-colors">Spin the Wheel</h2>
                <p className="text-gray-500 dark:text-gray-400">Can't decide where to go? Let fate decide.</p>
            </div>

            {/* --- CONTROLS (Updated to 3 columns) --- */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-300">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <p className="font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Pool of Pubs</p>
                        <div className="flex flex-col xl:flex-row gap-3">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${includeVisited ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
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
                        <select
                            value={criterionId}
                            onChange={e => setCriterionId(e.target.value)}
                            className="w-full px-4 py-3 font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer"
                        >
                            <option value="">No Filter (Include All)</option>
                            {yesNoCriteria.map(c => (
                                <option key={c.id} value={c.id}>Must have: {c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* --- NEW: AMENITIES TAG FILTER --- */}
                    <div className="space-y-3">
                        <label className="block font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-sm">Amenities Filter</label>
                        <select
                            value={tagFilter}
                            onChange={e => setTagFilter(e.target.value)}
                            className="w-full px-4 py-3 font-semibold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white transition-colors cursor-pointer"
                        >
                            <option value="">No Filter (Include All)</option>
                            {AVAILABLE_TAGS.map(tag => (
                                <option key={tag} value={tag}>Must have: {tag}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* --- THE WHEEL --- */}
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transition-colors duration-300 flex flex-col items-center overflow-hidden">
                
                <div className="relative w-full max-w-[450px] aspect-square mb-8 mt-4">
                    <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20 flex flex-col items-center">
                        <div className="w-8 h-12 bg-gray-800 dark:bg-white shadow-2xl" style={{ clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }}></div>
                    </div>

                    <div 
                        className="w-full h-full rounded-full shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(255,255,255,0.05)] overflow-hidden border-8 border-gray-800 dark:border-gray-100 bg-gray-100 dark:bg-gray-700"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.1, 1)' : 'none'
                        }}
                    >
                        {filteredPubs.length > 0 ? (
                            <canvas ref={canvasRef} width={800} height={800} className="w-full h-full object-contain" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                                <span className="text-4xl mb-2 opacity-50">🎡</span>
                                <p className="text-gray-500 dark:text-gray-400 font-bold">No pubs match your current filters!</p>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSpin}
                    disabled={isSpinning || filteredPubs.length === 0}
                    className="w-full max-w-sm bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-black text-2xl uppercase tracking-widest hover:from-blue-700 hover:to-purple-700 transition transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl shadow-blue-500/30"
                >
                    {isSpinning ? 'Spinning...' : 'SPIN THE WHEEL'}
                </button>

                <div className={`mt-8 text-center transition-all duration-500 ${spinResult ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4 hidden'}`}>
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">The Winner Is</p>
                    <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2 drop-shadow-sm">{spinResult?.name}</h3>
                    <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">📍 {spinResult?.location}</p>
                </div>
            </div>
        </div>
    );
}