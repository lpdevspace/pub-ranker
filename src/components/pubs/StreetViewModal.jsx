import React, { useState } from 'react';
import { X, ExternalLink, Compass, Navigation, MapPin, Eye, RotateCw } from 'lucide-react';
import { getStreetViewData } from '../../services/pubEnrichmentService';

export default function StreetViewModal({ pub, onClose }) {
    const [headingOffset, setHeadingOffset] = useState(0);

    if (!pub) return null;

    const baseHeading = pub.streetViewHeading || 180;
    const currentHeading = (baseHeading + headingOffset + 360) % 360;

    const streetView = getStreetViewData(pub.lat, pub.lng, currentHeading);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="card-tavern bg-[var(--color-surface)] w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border border-amber-500/30 animate-scaleIn">
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-[var(--color-divider)] flex items-center justify-between gap-3 bg-[var(--color-surface-offset)]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                            <Eye className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-display text-xl sm:text-2xl font-bold text-[var(--color-text)] truncate">
                                    {pub.name}
                                </h3>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    Street View 360°
                                </span>
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 truncate">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{pub.address || pub.location || 'Central London'}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-[var(--color-surface)] hover:bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] flex items-center justify-center transition cursor-pointer"
                        aria-label="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Street View Viewport */}
                <div className="relative w-full h-80 sm:h-96 bg-black flex items-center justify-center overflow-hidden">
                    {pub.lat && pub.lng ? (
                        <iframe
                            title={`Street view of ${pub.name}`}
                            src={streetView.embedUrl}
                            className="w-full h-full border-0"
                            loading="lazy"
                            allowFullScreen
                        />
                    ) : (
                        <div className="text-center p-6 text-white space-y-2">
                            <MapPin className="w-8 h-8 text-rose-500 mx-auto" />
                            <p className="text-sm font-bold">No location coordinates for this pub.</p>
                        </div>
                    )}

                    {/* Floating Heading Controls */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                        <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-white text-xs font-bold pointer-events-auto shadow-lg">
                            <Compass className="w-3.5 h-3.5 text-amber-400" />
                            <span>Heading: {Math.round(currentHeading)}°</span>
                        </div>

                        <div className="flex items-center gap-2 pointer-events-auto">
                            <button
                                type="button"
                                onClick={() => setHeadingOffset(prev => prev - 45)}
                                className="px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1 transition shadow-lg"
                                title="Pan left 45°"
                            >
                                <RotateCw className="w-3 h-3 scale-x-[-1]" />
                                <span>Look Left</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setHeadingOffset(prev => prev + 45)}
                                className="px-3 py-1.5 rounded-full bg-black/80 hover:bg-black text-white text-xs font-bold backdrop-blur-md border border-white/20 flex items-center gap-1 transition shadow-lg"
                                title="Pan right 45°"
                            >
                                <RotateCw className="w-3 h-3" />
                                <span>Look Right</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer with External Link & Coordinates */}
                <div className="p-4 sm:p-5 bg-[var(--color-surface-offset)] border-t border-[var(--color-divider)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="text-xs text-[var(--color-text-muted)] space-y-0.5">
                        <p className="font-semibold text-[var(--color-text)]">
                            Virtual pub facade & outdoor seating inspection
                        </p>
                        <p className="text-[11px] text-[var(--color-text-faint)]">
                            Powered by Google Street View & OpenStreetMap geodata
                        </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <a
                            href={streetView.webPanoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-fun-primary !py-2 !px-4 text-xs font-bold w-full sm:w-auto flex items-center justify-center gap-1.5 shadow-md"
                        >
                            <span>Open Full Google 360°</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-fun-secondary !py-2 !px-4 text-xs font-bold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
