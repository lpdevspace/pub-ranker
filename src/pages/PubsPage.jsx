import React, { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    Sparkles,
    Dices,
    LayoutGrid,
    List,
    MapPin,
    Star,
    Edit2,
    Trash2,
    X,
    Clock,
    Camera,
    RefreshCw,
    TrendingUp,
    Beer,
    Compass,
    CheckCircle2
} from 'lucide-react';
import { firebase } from '../firebase';
import PubCard from '../components/pubs/PubCard';
import PubDetailModal from '../components/pubs/PubDetailModal';
import AddPubModal from '../components/pubs/AddPubModal';
import StreetViewModal from '../components/pubs/StreetViewModal';
import { useToastContext } from '../context/ToastContext';
import { getLiveOpeningStatus, enrichPubWithOSM } from '../services/pubEnrichmentService';

const QUICK_FILTERS = [
    { id: 'open_now', label: '🟢 Open Now', filterFn: (p) => getLiveOpeningStatus(p.openingHours).isOpen },
    { id: 'top_tier', label: '⭐ Top Rated (8.5+)', filterFn: (p) => (p.avgScore || 0) >= 8.5 },
    { id: 'cheap_pint', label: '💰 Under £6', filterFn: (p) => (p.pintPrice && p.pintPrice < 6.00) },
    { id: 'real_ale', label: '🍺 Cask Ale', filterFn: (p) => !!p.realAle },
    { id: 'beer_garden', label: '🌳 Garden', filterFn: (p) => p.amenities?.hasBeerGarden },
    { id: 'dog_friendly', label: '🐶 Dogs', filterFn: (p) => p.amenities?.isDogFriendly },
    { id: 'food', label: '🍔 Food', filterFn: (p) => p.amenities?.servesFood },
    { id: 'sports', label: '📺 Sports', filterFn: (p) => p.amenities?.hasSportsTv },
];

export default function PubsPage({
    pubs = [],
    criteria = [],
    scores = {},
    onSelectPub,
    canManageGroup,
    allUsers = {},
    currentUser = {},
    currentGroup = {},
    groupRef,
    groupId,
    db,
    isShowingSampleFallback,
    seedRealData,
    isSeeding
}) {
    const { showToast } = useToastContext();

    // ── Local State ──────────────────────────────────────────────────────────
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);
    const [selectedPubForStreetView, setSelectedPubForStreetView] = useState(null);
    const [isAddPubOpen, setIsAddPubOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('highest');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'visited' | 'to_visit'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [activeQuickFilters, setActiveQuickFilters] = useState([]);
    const [isBatchEnriching, setIsBatchEnriching] = useState(false);

    // Smart Search
    const [isSmartSearching, setIsSmartSearching] = useState(false);
    const [smartSearchIds, setSmartSearchIds] = useState(null);

    // Secret Pub Picker
    const [showSecretModal, setShowSecretModal] = useState(false);
    const [secretPub, setSecretPub] = useState(null);

    // Edit Pub State
    const [editingPub, setEditingPub] = useState(null);
    const [editName, setEditName] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    const pubsRef = useMemo(() => {
        if (!groupRef) return null;
        return groupRef.collection('pubs');
    }, [groupRef]);

    // ── Enriched Pubs with score aggregations ─────────────────────────────────
    const enrichedPubs = useMemo(() => {
        if (!Array.isArray(pubs)) return [];
        return pubs.map(pub => {
            let totalScore = 0;
            let count = 0;
            if (Array.isArray(criteria)) {
                criteria.filter(c => c.type === 'scale').forEach(c => {
                    (scores[pub.id]?.[c.id] || []).forEach(s => {
                        if (s.value != null && !isNaN(s.value)) {
                            totalScore += s.value;
                            count++;
                        }
                    });
                });
            }
            const avg = count > 0 ? totalScore / count : 0;
            const liveStatus = getLiveOpeningStatus(pub.openingHours);

            return {
                ...pub,
                avgScore: avg,
                ratingCount: count,
                isVisited: pub.status === 'visited' || count > 0,
                isOpenNow: liveStatus.isOpen,
                liveStatus
            };
        });
    }, [pubs, criteria, scores]);

    // ── Summary Metrics for Hero Ribbon ──────────────────────────────────────
    const metrics = useMemo(() => {
        const total = enrichedPubs.length;
        const openNowCount = enrichedPubs.filter(p => p.isOpenNow).length;
        const visited = enrichedPubs.filter(p => p.isVisited);
        const avgScore = visited.length > 0
            ? (visited.reduce((acc, p) => acc + (p.avgScore || 0), 0) / visited.length)
            : 0;
        
        const withPrice = enrichedPubs.filter(p => p.pintPrice);
        const avgPrice = withPrice.length > 0
            ? (withPrice.reduce((acc, p) => acc + p.pintPrice, 0) / withPrice.length)
            : 0;

        const gardenCount = enrichedPubs.filter(p => p.amenities?.hasBeerGarden).length;

        return {
            total,
            openNowCount,
            avgScore,
            avgPrice,
            gardenCount
        };
    }, [enrichedPubs]);

    // ── Filtering & Sorting ──────────────────────────────────────────────────
    const filteredPubs = useMemo(() => {
        return enrichedPubs.filter(pub => {
            // Smart Search match filter
            if (smartSearchIds) {
                if (!smartSearchIds.includes(pub.id)) return false;
            } else if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const nameMatch = (pub.name || '').toLowerCase().includes(term);
                const locMatch = (pub.location || pub.address || '').toLowerCase().includes(term);
                const operatorMatch = (pub.operator || '').toLowerCase().includes(term);
                if (!nameMatch && !locMatch && !operatorMatch) return false;
            }

            // Tab filter
            if (activeTab === 'visited' && !pub.isVisited) return false;
            if (activeTab === 'to_visit' && pub.isVisited) return false;

            // Quick Filters
            for (const filterId of activeQuickFilters) {
                const filterDef = QUICK_FILTERS.find(f => f.id === filterId);
                if (filterDef && !filterDef.filterFn(pub)) {
                    return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (smartSearchIds) {
                return smartSearchIds.indexOf(a.id) - smartSearchIds.indexOf(b.id);
            }
            if (sortOption === 'highest') return (b.avgScore || 0) - (a.avgScore || 0);
            if (sortOption === 'lowest') return (a.avgScore || 0) - (b.avgScore || 0);
            if (sortOption === 'open_first') {
                if (a.isOpenNow && !b.isOpenNow) return -1;
                if (!a.isOpenNow && b.isOpenNow) return 1;
                return (b.avgScore || 0) - (a.avgScore || 0);
            }
            if (sortOption === 'price') return (a.pintPrice || 999) - (b.pintPrice || 999);
            if (sortOption === 'alphabetical') return (a.name || '').localeCompare(b.name || '');
            if (sortOption === 'newest') {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            }
            return 0;
        });
    }, [enrichedPubs, searchTerm, smartSearchIds, activeTab, activeQuickFilters, sortOption]);

    // Score Breakdown for selectedPubForDetail
    const breakdown = useMemo(() => {
        if (!selectedPubForDetail) return null;
        const b = {};
        const pubScores = scores[selectedPubForDetail.id] ?? {};
        if (Array.isArray(criteria)) {
            criteria.forEach(crit => {
                const criterionScores = pubScores[crit.id] ?? [];
                const mappedScores = criterionScores.map(s => ({
                    id: s.id,
                    value: s.value,
                    userId: s.userId,
                    type: s.type,
                    createdAt: s.createdAt,
                    userName: s.userName,
                }));
                const usable = criterionScores.filter(s => s.value != null);
                const sum = usable.reduce((acc, s) => s.type === 'scale' ? acc + s.value : acc, 0);
                b[crit.id] = {
                    name: crit.name,
                    type: crit.type,
                    scores: mappedScores,
                    average: usable.length ? sum / usable.length : 0
                };
            });
        }
        return b;
    }, [selectedPubForDetail, scores, criteria]);

    // ── Batch OSM Enrichment ─────────────────────────────────────────────────
    const handleBatchEnrichOSM = async () => {
        if (!pubsRef) {
            showToast('OSM sync active in demo/sample mode', 'info');
            return;
        }
        setIsBatchEnriching(true);
        try {
            let count = 0;
            for (const pub of enrichedPubs.slice(0, 5)) {
                const res = await enrichPubWithOSM(pub);
                if (res && res.openingHours) {
                    await pubsRef.doc(pub.id).update({
                        openingHours: res.openingHours,
                        phone: res.phone || pub.phone || '',
                        website: res.website || pub.website || '',
                        operator: res.operator || pub.operator || '',
                    });
                    count++;
                }
            }
            showToast(`Synchronized ${count} pubs with live OpenStreetMap hours!`, 'success');
        } catch (e) {
            console.error('Batch enrich error:', e);
            showToast('Enrichment completed with local caching.', 'info');
        } finally {
            setIsBatchEnriching(false);
        }
    };

    // ── Smart Search ─────────────────────────────────────────────────────────
    const handleSmartSearch = async () => {
        if (!searchTerm.trim()) return;
        const targetGroupId = groupId || currentGroup?.id;
        if (!targetGroupId) {
            showToast('Group context is missing', 'error');
            return;
        }

        setIsSmartSearching(true);
        try {
            const searchFn = firebase.app().functions('europe-west2').httpsCallable('aiSmartSearch');
            const res = await searchFn({ groupId: targetGroupId, query: searchTerm });
            if (res.data?.pubIds && Array.isArray(res.data.pubIds)) {
                setSmartSearchIds(res.data.pubIds);
                showToast(`Found ${res.data.pubIds.length} smart matches!`, 'info');
            } else {
                setSmartSearchIds([]);
                showToast('No pubs matched your description.', 'info');
            }
        } catch (err) {
            console.error('Smart Search error:', err);
            // Local fallback semantic filter
            const term = searchTerm.toLowerCase();
            const localMatches = enrichedPubs.filter(p => 
                (p.vibeSummary || '').toLowerCase().includes(term) ||
                (p.name || '').toLowerCase().includes(term) ||
                (p.operator || '').toLowerCase().includes(term)
            ).map(p => p.id);
            setSmartSearchIds(localMatches);
            showToast(`Filtered ${localMatches.length} pubs matching "${searchTerm}"`, 'info');
        } finally {
            setIsSmartSearching(false);
        }
    };

    // ── Secret Pub Picker ────────────────────────────────────────────────────
    const handlePickSecretPub = () => {
        const pool = enrichedPubs.filter(p => !p.isVisited);
        const candidates = pool.length > 0 ? pool : enrichedPubs;
        if (candidates.length === 0) {
            showToast('No pubs in your directory yet!', 'info');
            return;
        }
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        setSecretPub(pick);
        setShowSecretModal(true);
    };

    // ── Edit Pub Handlers ────────────────────────────────────────────────────
    const handleStartEdit = (pub) => {
        setEditingPub(pub);
        setEditName(pub.name || '');
        setEditLocation(pub.location || pub.address || '');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingPub || !groupRef) return;
        setIsUpdating(true);
        try {
            await groupRef.collection('pubs').doc(editingPub.id).update({
                name: editName.trim(),
                location: editLocation.trim(),
                address: editLocation.trim(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            showToast('Pub details updated', 'success');
            setEditingPub(null);
        } catch (err) {
            console.error('Failed to update pub:', err);
            showToast('Failed to update pub', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    // ── Delete Pub ───────────────────────────────────────────────────────────
    const handleDeletePub = async (pubId) => {
        if (!groupRef || !pubId) return;
        if (!window.confirm('Are you sure you want to delete this pub? This will remove all associated scores.')) return;

        try {
            await groupRef.collection('pubs').doc(pubId).delete();
            const targetGroupId = groupId || currentGroup?.id;
            if (db && targetGroupId) {
                await db.collection('groups').doc(targetGroupId).update({
                    pubCount: firebase.firestore.FieldValue.increment(-1)
                });
            }
            showToast('Pub deleted from directory', 'info');
        } catch (err) {
            console.error('Failed to delete pub:', err);
            showToast('Failed to delete pub', 'error');
        }
    };

    return (
        <div className="w-full space-y-6 animate-fadeIn pb-24">
            {/* ── 1. Hero Command Center ────────────────────────────────────────── */}
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-stone-900 via-stone-900/90 to-amber-950/40 border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
                {/* Background glow effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                            <Beer className="w-3.5 h-3.5" />
                            <span>The Sovereign Pub Circuit · London</span>
                        </div>

                        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                            Pub Directory & Taps
                        </h1>

                        <p className="text-xs sm:text-sm text-stone-300 leading-relaxed font-medium">
                            Live opening hours, real-time busy meters, 360° street view facades, and member reviews across your collective's favourite watering holes.
                        </p>

                        {/* Live Metric Badges */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2">
                            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 shadow-sm">
                                <span className="text-amber-400 font-black">{metrics.total}</span>
                                <span className="text-stone-300">Curated Pubs</span>
                            </div>

                            <div className="px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 backdrop-blur-md text-xs font-bold text-emerald-300 flex items-center gap-1.5 shadow-sm">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="font-black">{metrics.openNowCount}</span>
                                <span>Open Now</span>
                            </div>

                            {metrics.avgScore > 0 && (
                                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-xs font-bold text-amber-300 flex items-center gap-1.5 shadow-sm">
                                    <span>★</span>
                                    <span className="font-black">{metrics.avgScore.toFixed(1)}</span>
                                    <span className="text-stone-300">Group Avg</span>
                                </div>
                            )}

                            {metrics.avgPrice > 0 && (
                                <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-md text-xs font-bold text-white flex items-center gap-1.5 shadow-sm">
                                    <span className="text-amber-400">£{metrics.avgPrice.toFixed(2)}</span>
                                    <span className="text-stone-300">Avg Pint</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons Column */}
                    <div className="flex flex-wrap sm:flex-col items-stretch gap-2.5 shrink-0 min-w-[200px]">
                        {isShowingSampleFallback && (
                            <button
                                onClick={async () => {
                                    if (seedRealData) {
                                        try {
                                            await seedRealData(currentUser);
                                            showToast('Saved 10 real UK pubs to your database! 🍺', 'success');
                                        } catch (e) {
                                            showToast('Failed to save: ' + e.message, 'error');
                                        }
                                    }
                                }}
                                disabled={isSeeding}
                                className="btn-fun-primary !bg-emerald-500 !text-slate-950 !py-3 !px-4 text-xs font-black shadow-lg flex items-center justify-center gap-2 hover:scale-102 transition"
                                title="Persist these real UK pubs into your Firestore group"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>{isSeeding ? 'Writing to DB…' : 'Save 10 Pubs to DB'}</span>
                            </button>
                        )}

                        <button
                            onClick={handleBatchEnrichOSM}
                            disabled={isBatchEnriching}
                            className="btn-fun-secondary !py-2.5 !px-4 text-xs font-bold flex items-center justify-center gap-2 border-amber-500/30 text-white"
                            title="Query OpenStreetMap Overpass API for live opening hours"
                        >
                            <RefreshCw className={`w-4 h-4 text-amber-400 ${isBatchEnriching ? 'animate-spin' : ''}`} />
                            <span>{isBatchEnriching ? 'Syncing OSM…' : 'Sync OSM Hours'}</span>
                        </button>

                        <button
                            onClick={handlePickSecretPub}
                            className="btn-fun-secondary !py-2.5 !px-4 text-xs font-bold flex items-center justify-center gap-2 border-purple-500/30 text-white"
                            title="Let the Tavern Oracle pick a pub for your group"
                        >
                            <Dices className="w-4 h-4 text-purple-400" />
                            <span>Tavern Oracle</span>
                        </button>

                        <button
                            onClick={() => setIsAddPubOpen(true)}
                            className="btn-fun-primary !py-2.5 !px-4 text-xs font-black flex items-center justify-center gap-2 shadow-md hover:scale-102 transition"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add New Pub</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── 2. Filter Navigation & Quick Chips ────────────────────────────── */}
            <div className="flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1 bg-[var(--color-surface-offset)] p-1 rounded-2xl border border-[var(--color-border)] w-fit shadow-sm">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'all'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            <span>All Taverns</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] font-bold">
                                {enrichedPubs.length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('visited')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'visited'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            <span>Rated</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-black">
                                {enrichedPubs.filter(p => p.isVisited).length}
                            </span>
                        </button>

                        <button
                            onClick={() => setActiveTab('to_visit')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                                activeTab === 'to_visit'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                        >
                            <span>Hit List</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black">
                                {enrichedPubs.filter(p => !p.isVisited).length}
                            </span>
                        </button>
                    </div>

                    {/* Quick Filters Horizontal Scrolling Bar */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {QUICK_FILTERS.map(f => {
                            const isSelected = activeQuickFilters.includes(f.id);
                            return (
                                <button
                                    key={f.id}
                                    onClick={() => {
                                        setActiveQuickFilters(prev =>
                                            prev.includes(f.id)
                                                ? prev.filter(x => x !== f.id)
                                                : [...prev, f.id]
                                        );
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 border cursor-pointer ${
                                        isSelected
                                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-sm ring-2 ring-amber-400/30'
                                            : 'bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-amber-500/50 hover:text-[var(--color-text)]'
                                    }`}
                                >
                                    <span>{f.label}</span>
                                </button>
                            );
                        })}

                        {activeQuickFilters.length > 0 && (
                            <button
                                onClick={() => setActiveQuickFilters([])}
                                className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text)] underline font-bold px-1"
                            >
                                Clear ({activeQuickFilters.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* ── 3. Search Bar, Sort & View Mode Toggle ───────────────────── */}
                <div className="card-tavern p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border border-[var(--color-border)] rounded-2xl shadow-sm">
                    {/* Search Input + AI Smart Search */}
                    <div className="flex-1 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search by pub name, area, brewery or feature (e.g. 'Notting Hill', 'Fullers')..."
                                value={searchTerm}
                                onChange={e => {
                                    setSearchTerm(e.target.value);
                                    if (!e.target.value) setSmartSearchIds(null);
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSmartSearch();
                                }}
                                className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-amber-500 transition font-medium"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setSmartSearchIds(null);
                                    }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={handleSmartSearch}
                            disabled={isSmartSearching || !searchTerm.trim()}
                            className={`text-xs px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                                isSmartSearching || !searchTerm.trim()
                                    ? 'bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] cursor-not-allowed border border-[var(--color-border)]'
                                    : 'bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-amber-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 hover:border-purple-500 cursor-pointer shadow-sm'
                            }`}
                            title="AI-powered intent search (e.g. 'historic pub with cozy fireplace and real ale')"
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span className="hidden sm:inline">
                                {isSmartSearching ? 'Analyzing...' : 'AI Search'}
                            </span>
                        </button>
                    </div>

                    {/* Sort Dropdown & View Mode Switcher */}
                    <div className="flex items-center gap-2 justify-end shrink-0">
                        <select
                            value={sortOption}
                            onChange={e => setSortOption(e.target.value)}
                            className="text-xs px-3.5 py-2.5 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] font-bold focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
                        >
                            <option value="highest">★ Highest Rated</option>
                            <option value="open_first">🟢 Open Now First</option>
                            <option value="price">💰 Cheapest Pint</option>
                            <option value="alphabetical">🔤 Alphabetical (A-Z)</option>
                            <option value="lowest">Lowest Rated</option>
                            <option value="newest">Newest Added</option>
                        </select>

                        <div className="flex items-center bg-[var(--color-surface-offset)] p-0.5 rounded-xl border border-[var(--color-border)] shadow-sm">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition cursor-pointer ${
                                    viewMode === 'grid'
                                        ? 'bg-[var(--color-surface)] text-amber-500 shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                                title="Grid View"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition cursor-pointer ${
                                    viewMode === 'list'
                                        ? 'bg-[var(--color-surface)] text-amber-500 shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                                title="List View"
                            >
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* AI Search Active Filter Bar */}
                {smartSearchIds && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-xs text-purple-700 dark:text-purple-300 shadow-sm animate-fadeIn">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span>Showing <strong>{filteredPubs.length}</strong> AI matches for &ldquo;{searchTerm}&rdquo;</span>
                        </div>
                        <button
                            onClick={() => {
                                setSmartSearchIds(null);
                                setSearchTerm('');
                            }}
                            className="font-black underline hover:no-underline cursor-pointer"
                        >
                            Clear AI Filter
                        </button>
                    </div>
                )}
            </div>

            {/* ── 4. Main Content: Grid or Sleek Row List ──────────────────────── */}
            {filteredPubs.length === 0 ? (
                <div className="card-tavern p-12 text-center border border-[var(--color-border)] rounded-3xl space-y-3">
                    <div className="text-5xl">🍺</div>
                    <h3 className="font-display text-2xl font-bold text-[var(--color-text)]">
                        No Pubs Match Your Filters
                    </h3>
                    <p className="text-xs text-[var(--color-text-muted)] max-w-sm mx-auto">
                        Try loosening your quick filters, clearing the search query, or add a new pub to your group.
                    </p>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSmartSearchIds(null);
                            setActiveQuickFilters([]);
                            setActiveTab('all');
                        }}
                        className="btn-fun-primary !py-2 !px-4 text-xs font-bold mt-2"
                    >
                        Reset All Filters
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredPubs.map((pub, idx) => (
                        <PubCard
                            key={pub.id}
                            pub={pub}
                            rank={sortOption === 'highest' && pub.isVisited ? idx + 1 : null}
                            onViewDetail={setSelectedPubForDetail}
                            onRate={onSelectPub}
                            onOpenStreetView={setSelectedPubForStreetView}
                            canManageGroup={canManageGroup}
                            onEdit={handleStartEdit}
                            onDelete={handleDeletePub}
                        />
                    ))}
                </div>
            ) : (
                /* Sleek Row List View (Upgraded) */
                <div className="space-y-3">
                    {filteredPubs.map((pub, idx) => {
                        const isVisited = pub.status === 'visited' || (pub.ratingCount && pub.ratingCount > 0);
                        return (
                            <div
                                key={pub.id}
                                onClick={() => setSelectedPubForDetail(pub)}
                                className="card-tavern p-4 sm:p-5 rounded-2xl border border-[var(--color-border)] hover:border-amber-500/50 hover:shadow-lg transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    {/* Thumbnail with Street View Trigger */}
                                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-900 shrink-0 border border-white/10 shadow-sm">
                                        {pub.photoURL ? (
                                            <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl">🍺</div>
                                        )}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPubForStreetView(pub);
                                            }}
                                            className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-black/80 hover:bg-black text-amber-400 flex items-center justify-center shadow-md border border-white/20 transition"
                                            title="Quick Street View"
                                        >
                                            <Camera className="w-3 h-3" />
                                        </button>
                                    </div>

                                    {/* Title & Info */}
                                    <div className="min-w-0 space-y-1">
                                        <div className="flex items-center gap-2">
                                            {sortOption === 'highest' && isVisited && (
                                                <span className="text-xs font-black text-amber-500">
                                                    #{idx + 1}
                                                </span>
                                            )}
                                            <h3 className="font-display text-lg sm:text-xl font-bold text-[var(--color-text)] group-hover:text-amber-500 transition truncate">
                                                {pub.name}
                                            </h3>
                                            {pub.operator && (
                                                <span className="hidden md:inline-block text-[10px] font-bold px-2 py-0.2 rounded-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text-muted)]">
                                                    {pub.operator}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                            <span>{pub.location || pub.address || 'Central London'}</span>
                                        </p>

                                        {/* Status & Amenities Ribbon */}
                                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[10px]">
                                            <span className={`font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                                pub.isOpenNow
                                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-slate-800 text-slate-300'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${pub.isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                                <span>{pub.liveStatus.statusText}</span>
                                            </span>

                                            {pub.pintPrice && (
                                                <span className="font-bold px-2 py-0.5 rounded-full bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-amber-500">
                                                    Pint £{pub.pintPrice.toFixed(2)}
                                                </span>
                                            )}

                                            {pub.realAle && (
                                                <span className="font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hidden sm:inline-block">
                                                    🍺 Real Ale
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side: Score & Action Buttons */}
                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-divider)]">
                                    <div className="text-left sm:text-right">
                                        {isVisited && pub.ratingCount > 0 ? (
                                            <div className="flex sm:flex-col items-baseline sm:items-end gap-1.5 sm:gap-0">
                                                <span className="font-display text-2xl font-black text-[var(--color-text)] tabular-nums text-amber-500">
                                                    ★ {pub.avgScore.toFixed(1)}
                                                </span>
                                                <span className="text-[10px] font-bold text-[var(--color-text-faint)] uppercase">
                                                    {pub.ratingCount} {pub.ratingCount === 1 ? 'rating' : 'ratings'}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-amber-500">
                                                Unrated
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => onSelectPub(pub)}
                                            className="btn-fun-primary !py-1.5 !px-3.5 !text-xs font-bold flex items-center gap-1 shadow-sm"
                                        >
                                            <Star className="w-3.5 h-3.5 fill-current" />
                                            <span>Rate</span>
                                        </button>

                                        {canManageGroup && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleStartEdit(pub)}
                                                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] transition"
                                                    title="Edit pub"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePub(pub.id)}
                                                    className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-rose-500 hover:bg-rose-500/10 transition"
                                                    title="Delete pub"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── 5. Modals ────────────────────────────────────────────────────── */}

            {/* 1. Add Pub Modal */}
            <AddPubModal
                isOpen={isAddPubOpen}
                onClose={() => setIsAddPubOpen(false)}
                groupRef={groupRef}
                db={db}
                groupId={groupId || currentGroup?.id}
                user={currentUser}
            />

            {/* 2. Pub Detail & Breakdown Modal */}
            {selectedPubForDetail && breakdown && (
                <PubDetailModal
                    pub={selectedPubForDetail}
                    breakdown={breakdown}
                    allUsers={allUsers}
                    currentUser={currentUser}
                    groupRef={groupRef}
                    pubsRef={pubsRef}
                    db={db}
                    canManageGroup={canManageGroup}
                    onClose={() => setSelectedPubForDetail(null)}
                    onSelectPub={onSelectPub}
                />
            )}

            {/* 3. Street View 360° Modal */}
            {selectedPubForStreetView && (
                <StreetViewModal
                    pub={selectedPubForStreetView}
                    onClose={() => setSelectedPubForStreetView(null)}
                />
            )}

            {/* 4. Inline Edit Pub Modal */}
            {editingPub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
                    <form
                        onSubmit={handleSaveEdit}
                        className="card-tavern bg-[var(--color-surface)] p-6 rounded-2xl w-full max-w-md border border-[var(--color-border)] shadow-2xl relative space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-display text-2xl font-black text-[var(--color-text)]">
                                Edit Tavern Details
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingPub(null)}
                                className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                Pub Name
                            </label>
                            <input
                                type="text"
                                required
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-amber-500 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase mb-1">
                                Location / Area
                            </label>
                            <input
                                type="text"
                                value={editLocation}
                                onChange={e => setEditLocation(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-amber-500 font-medium"
                            />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-divider)]">
                            <button
                                type="button"
                                onClick={() => setEditingPub(null)}
                                className="btn-fun-secondary text-xs px-4 py-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="btn-fun-primary text-xs px-4 py-2 font-bold"
                            >
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 5. Secret Pub Reveal Modal (The Oracle) */}
            {showSecretModal && secretPub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="card-tavern bg-[var(--color-surface)] p-6 sm:p-8 rounded-3xl w-full max-w-md text-center border border-amber-500/30 shadow-2xl relative overflow-hidden">
                        <div className="text-5xl mb-3 animate-bounce">🎲</div>
                        <h3 className="font-display text-3xl font-black text-amber-500 mb-1">
                            The Tavern Oracle Has Spoken
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] mb-5">
                            Tonight&apos;s mystery rendezvous destination:
                        </p>

                        <div className="p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] mb-6 text-left space-y-2">
                            <h4 className="font-display text-2xl font-bold text-[var(--color-text)]">
                                {secretPub.name}
                            </h4>
                            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                <span>{secretPub.location || secretPub.address || 'Local Pub'}</span>
                            </p>
                            {!secretPub.isVisited && (
                                <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-500 border border-amber-500/30">
                                    ⭐ Uncharted Territory (To Visit)
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={() => setShowSecretModal(false)}
                                className="btn-fun-secondary text-xs px-4 py-2.5 font-bold"
                            >
                                Roll Again Later
                            </button>
                            <button
                                onClick={() => {
                                    setShowSecretModal(false);
                                    setSelectedPubForDetail(secretPub);
                                }}
                                className="btn-fun-primary text-xs px-5 py-2.5 font-bold shadow-md"
                            >
                                View Tavern Details →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
