import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

export default function SpinTheWheelPage({ pubs, criteria, scores }) {
    const [filteredPubs, setFilteredPubs] = useState([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [spinResult, setSpinResult] = useState(null);
    const [includeVisited, setIncludeVisited] = useState(true);
    const [includeToVisit, setIncludeToVisit] = useState(true);
    const [criterionId, setCriterionId] = useState('');
    const [rotation, setRotation] = useState(0);
    const canvasRef = useRef(null);
    const wheelContainerRef = useRef(null);

    const yesNoCriteria = criteria.filter(c => c.type === 'yes-no');

    useEffect(() => {
        const pubsByStatus = pubs.filter(pub => {
            const isVisited = pub.status === 'visited';
            const isToVisit = pub.status !== 'visited';
            return (includeVisited && isVisited) || (includeToVisit && isToVisit);
        });

        if (!criterionId) {
            setFilteredPubs(pubsByStatus);
            return;
        }

        const pubsByCriterion = pubsByStatus.filter(pub => {
            const pubScores = scores[pub.id];
            const criterionScores = pubScores?.[criterionId];
            return criterionScores?.some(s => s.value === true);
        });
        setFilteredPubs(pubsByCriterion);
    }, [pubs, scores, criteria, includeVisited, includeToVisit, criterionId]);

    useEffect(() => {
        if (!canvasRef.current || filteredPubs.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 300;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const sliceAngle = (Math.PI * 2) / filteredPubs.length;
        const colors = filteredPubs.map((_, i) =>
            `hsl(${(i * 360) / filteredPubs.length}, 70%, 60%)`
        );

        filteredPubs.forEach((pub, i) => {
            const startAngle = sliceAngle * i;
            const endAngle = startAngle + sliceAngle;

            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();

            const midAngle = (startAngle + endAngle) / 2;
            const textX = centerX + Math.cos(midAngle) * (radius * 0.65);
            const textY = centerY + Math.sin(midAngle) * (radius * 0.65);

            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(midAngle);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pub.name.substring(0, 24), 0, 0);
            ctx.restore();
        });

        ctx.beginPath();
        ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }, [filteredPubs]);

    const handleSpin = () => {
        if (isSpinning || filteredPubs.length === 0) return;
        
        setIsSpinning(true);
        setSpinResult(null);

        const duration = 3000;
        const startTime = Date.now();
        const sliceAngle = (Math.PI * 2) / filteredPubs.length;
        const randomIndex = Math.floor(Math.random() * filteredPubs.length);
        const targetAngle = randomIndex * sliceAngle + (sliceAngle / 2);
        const finalRotation = Math.random() * 360 + 720 + (targetAngle * 180 / Math.PI);

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentRotation = finalRotation * easeOut;
            
            setRotation(currentRotation);

            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                setRotation(finalRotation);
                setSpinResult(filteredPubs[randomIndex]);
                setIsSpinning(false);
                
                // Trigger confetti using the imported library
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            }
        };

        requestAnimationFrame(animate);
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-gray-800">Spin the Wheel</h2>

            <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
                <h3 className="text-xl font-semibold text-gray-700">Wheel Options</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <p className="font-medium text-gray-600">Pubs to Include</p>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeVisited}
                                onChange={() => setIncludeVisited(!includeVisited)}
                                className="h-5 w-5 rounded text-blue-600"
                            />
                            <span className="text-gray-700">Visited Pubs</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeToVisit}
                                onChange={() => setIncludeToVisit(!includeToVisit)}
                                className="h-5 w-5 rounded text-orange-600"
                            />
                            <span className="text-gray-700">Pubs to Visit</span>
                        </label>
                    </div>

                    <div className="space-y-2">
                        <label className="block font-medium text-gray-600">Filter by Yes Criterion</label>
                        <select
                            value={criterionId}
                            onChange={e => setCriterionId(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">All Pubs that match status</option>
                            {yesNoCriteria.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
                <div className="flex justify-center relative">
                    <div
                        ref={wheelContainerRef}
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'none' : 'transform 0.3s ease-out',
                            width: '750px',
                            height: '750px'
                        }}
                    >
                        <canvas
                            ref={canvasRef}
                            width={650}
                            height={650}
                            className="border-2 border-gray-200 rounded-lg block"
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>

                <div className="text-center mt-6">
                    <button
                        onClick={handleSpin}
                        disabled={isSpinning || filteredPubs.length === 0}
                        className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold text-xl hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                        {isSpinning ? 'Spinning...' : 'SPIN!'}
                    </button>
                </div>

                {spinResult && (
                    <div className="mt-6 text-center">
                        <h3 className="text-2xl font-bold text-blue-600 mb-2">The Winner Is!</h3>
                        <p className="text-4xl font-bold text-gray-800 animate-pulse">{spinResult.name}</p>
                        <p className="text-lg text-gray-600 mt-2">{spinResult.location}</p>
                    </div>
                )}

                {filteredPubs.length === 0 && !isSpinning && (
                    <p className="mt-6 text-center text-lg text-red-600 font-semibold">
                        No pubs match your filters! Try changing your options.
                    </p>
                )}
            </div>
        </div>
    );
}