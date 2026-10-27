import React, { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    Sparkles,
    Dices,
    LayoutGrid,
    List,
    SlidersHorizontal,
    MapPin,
    Star,
    Edit2,
    Trash2,
    X,
    Filter
} from 'lucide-react';
import { firebase } from '../firebase';
import PubCard from '../components/pubs/PubCard';
import PubDetailModal from '../components/pubs/PubDetailModal';
import AddPubModal from '../components/pubs/AddPubModal';
import { useToastContext } from '../context/ToastContext';

const AMENITY_OPTIONS = [
    { id: 'isDogFriendly', label: '🐶 Dogs' },
    { id: 'hasSportsTv', label: '📺 Sports' },
    { id: 'hasBeerGarden', label: '🌳 Garden' },
    { id: 'wheelchairAccessible', label: '♿ Accessible' },
    { id: 'servesFood', label: '🍔 Food' }
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
    const [isAddPubOpen, setIsAddPubOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOption, setSortOption] = useState('highest');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'visited' | 'to_visit'
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
    const [selectedAmenities, setSelectedAmenities] = useState([]);
    
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
            return {
                ...pub,
                avgScore: avg,
                ratingCount: count,
                isVisited: pub.status === 'visited' || count > 0,
            };
        });
    }, [pubs, criteria, scores]);

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
                if (!nameMatch && !locMatch) return false;
            }

            // Tab filter
            if (activeTab === 'visited' && !pub.isVisited) return false;
            if (activeTab === 'to_visit' && pub.isVisited) return false;

            // Amenity filter
            if (selectedAmenities.length > 0) {
                const pubAmenities = pub.amenities || {};
                for (const amenity of selectedAmenities) {
                    if (!pubAmenities[amenity]) return false;
                }
            }

            return true;
        }).sort((a, b) => {
            if (smartSearchIds) {
                return smartSearchIds.indexOf(a.id) - smartSearchIds.indexOf(b.id);
            }
            if (sortOption === 'highest') return (b.avgScore || 0) - (a.avgScore || 0);
            if (sortOption === 'lowest') return (a.avgScore || 0) - (b.avgScore || 0);
            if (sortOption === 'alphabetical') return (a.name || '').localeCompare(b.name || '');
            if (sortOption === 'price') return (a.pintPrice || 999) - (b.pintPrice || 999);
            if (sortOption === 'newest') {
                const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
                const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
                return timeB - timeA;
            }
            return 0;
        });
    }, [enrichedPubs, searchTerm, smartSearchIds, activeTab, selectedAmenities, sortOption]);

    // Counts for tabs
    const visitedCount = useMemo(() => enrichedPubs.filter(p => p.isVisited).length, [enrichedPubs]);
    const toVisitCount = useMemo(() => enrichedPubs.filter(p => !p.isVisited).length, [enrichedPubs]);

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
            showToast('Smart Search unavailable right now', 'error');
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
            {/* Header: Title, Subtitle, and Add Pub Action */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--color-divider)] pb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">📍</span>
                        <h1 className="font-display text-3xl sm:text-4xl font-black text-[var(--color-text)] tracking-tight">
                            Pub Directory
                        </h1>
                    </div>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1">
                        Explore, rate, and filter watering holes curated by your collective.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
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
                            className="btn-fun-primary !bg-emerald-500 !text-slate-950 !py-2.5 !px-4 text-xs font-black shadow-md flex items-center gap-1.5"
                            title="Save these 10 real pubs into your group database"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>{isSeeding ? 'Saving…' : 'Save to DB'}</span>
                        </button>
                    )}

                    <button
                        onClick={handlePickSecretPub}
                        className="btn-fun-secondary flex-1 sm:flex-initial !py-2.5 !px-4 text-xs font-bold"
                        title="Pick a random pub"
                    >
                        <Dices className="w-4 h-4 text-amber-500" />
                        <span>Secret Pub</span>
                    </button>

                    <button
                        onClick={() => setIsAddPubOpen(true)}
                        className="btn-fun-primary flex-1 sm:flex-initial !py-2.5 !px-4 text-xs font-extrabold"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Pub</span>
                    </button>
                </div>
            </div>

            {/* Filter Pills & Status Tabs Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Status Tabs */}
                <div className="flex items-center gap-1 bg-[var(--color-surface-offset)] p-1 rounded-xl border border-[var(--color-border)] w-fit">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'all'
                                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                        <span>All Pubs</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--color-surface-offset)] text-[var(--color-text-faint)]">
                            {enrichedPubs.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('visited')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'visited'
                                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                        <span>Rated</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 font-black">
                            {visitedCount}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('to_visit')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'to_visit'
                                ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                    >
                        <span>Hit List</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 font-black">
                            {toVisitCount}
                        </span>
                    </button>
                </div>

                {/* Amenity Filter Badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)] mr-1">
                        Filters:
                    </span>
                    {AMENITY_OPTIONS.map(a => {
                        const isSelected = selectedAmenities.includes(a.id);
                        return (
                            <button
                                key={a.id}
                                onClick={() => {
                                    setSelectedAmenities(prev =>
                                        prev.includes(a.id)
                                            ? prev.filter(x => x !== a.id)
                                            : [...prev, a.id]
                                    );
                                }}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                                    isSelected
                                        ? 'bg-[var(--color-brand)] text-stone-900 border-[var(--color-brand)] font-bold shadow-sm'
                                        : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-brand)]'
                                }`}
                            >
                                {a.label}
                            </button>
                        );
                    })}

                    {selectedAmenities.length > 0 && (
                        <button
                            onClick={() => setSelectedAmenities([])}
                            className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text)] underline ml-1"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Search, AI Smart Search, Sort, and View Mode Switcher */}
            <div className="card-tavern p-3 sm:p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between border border-[var(--color-border)]">
                {/* Search input + AI Smart Search */}
                <div className="flex-1 flex items-center gap-2">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search pubs by name or location..."
                            value={searchTerm}
                            onChange={e => {
                                setSearchTerm(e.target.value);
                                if (!e.target.value) setSmartSearchIds(null);
                            }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSmartSearch();
                            }}
                            className="w-full pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] placeholder-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-brand)] transition"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setSmartSearchIds(null);
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={handleSmartSearch}
                        disabled={isSmartSearching || !searchTerm.trim()}
                        className={`text-xs px-3.5 py-2 rounded-xl font-bold transition flex items-center gap-1.5 shrink-0 ${
                            isSmartSearching || !searchTerm.trim()
                                ? 'bg-[var(--color-surface-offset)] text-[var(--color-text-faint)] cursor-not-allowed border border-[var(--color-border)]'
                                : 'bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:border-purple-500 cursor-pointer'
                        }`}
                        title="AI-powered smart search (e.g. 'craft beer and dog friendly')"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">
                            {isSmartSearching ? 'Searching...' : 'AI Search'}
                        </span>
                    </button>
                </div>

                {/* Right controls: Sort Dropdown & Grid/List View Toggle */}
                <div className="flex items-center gap-2 justify-end shrink-0">
                    <select
                        value={sortOption}
                        onChange={e => setSortOption(e.target.value)}
                        className="text-xs px-3 py-2 rounded-xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] font-semibold focus:outline-none focus:border-[var(--color-brand)] cursor-pointer"
                    >
                        <option value="highest">Highest Rated</option>
                        <option value="lowest">Lowest Rated</option>
                        <option value="price">Cheapest Pint</option>
                        <option value="newest">Newest Added</option>
                        <option value="alphabetical">Alphabetical</option>
                    </select>

                    <div className="flex items-center bg-[var(--color-surface-offset)] p-0.5 rounded-xl border border-[var(--color-border)]">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-lg transition ${
                                viewMode === 'grid'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-lg transition ${
                                viewMode === 'list'
                                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                            }`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Smart Search Filter Indicator Banner */}
            {smartSearchIds && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-700 dark:text-purple-300">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span>Showing <strong>{filteredPubs.length}</strong> AI matches for &ldquo;{searchTerm}&rdquo;</span>
                    </div>
                    <button
                        onClick={() => {
                            setSmartSearchIds(null);
                            setSearchTerm('');
                        }}
                        className="font-bold underline hover:no-underline"
                    >
                        Clear AI Filter
                    </button>
                </div>
            )}

            {/* Directory Cards (Grid Mode) */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredPubs.map(pub => (
                        <PubCard
                            key={pub.id}
                            pub={pub}
                            onViewDetail={setSelectedPubForDetail}
                            onRate={onSelectPub}
                            canManageGroup={canManageGroup}
                            onEdit={handleStartEdit}
                            onDelete={handleDeletePub}
                        />
                    ))}
                </div>
            )}

            {/* Directory Table / List Mode */}
            {viewMode === 'list' && (
                <div className="card-tavern overflow-hidden border border-[var(--color-border)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-[var(--color-surface-offset)] border-b border-[var(--color-divider)] text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                                <tr>
                                    <th className="py-3 px-4">Pub Name</th>
                                    <th className="py-3 px-4">Location</th>
                                    <th className="py-3 px-4 text-center">Verdict</th>
                                    <th className="py-3 px-4 text-center">Pint Price</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-divider)]">
                                {filteredPubs.map(pub => (
                                    <tr
                                        key={pub.id}
                                        onClick={() => setSelectedPubForDetail(pub)}
                                        className="hover:bg-[var(--color-surface-offset)]/50 cursor-pointer transition group"
                                    >
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[var(--color-surface-offset)] shrink-0">
                                                    {pub.photoURL ? (
                                                        <img src={pub.photoURL} alt={pub.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-sm">🍺</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-display text-base font-normal text-[var(--color-text)] group-hover:text-[var(--color-brand)] transition">
                                                        {pub.name}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--color-text-faint)]">
                                                        {pub.ratingCount || 0} group ratings
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-[var(--color-text-muted)]">
                                            <span className="flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                                <span className="truncate max-w-[200px]">{pub.location || 'Local Pub'}</span>
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            {pub.isVisited && pub.ratingCount > 0 ? (
                                                <span className="font-display text-lg font-bold text-[var(--color-text)] tabular-nums">
                                                    {pub.avgScore ? pub.avgScore.toFixed(1) : '—'}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-faint)]">
                                                    To Visit
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4 text-center text-xs font-bold text-amber-500">
                                            {pub.pintPrice ? `£${pub.pintPrice.toFixed(2)}` : '—'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => onSelectPub(pub)}
                                                    className="btn-brand text-xs px-2.5 py-1"
                                                >
                                                    <Star className="w-3 h-3" />
                                                    <span>Rate</span>
                                                </button>
                                                {canManageGroup && (
                                                    <>
                                                        <button
                                                            onClick={() => handleStartEdit(pub)}
                                                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePub(pub.id)}
                                                            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-red-500"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {filteredPubs.length === 0 && (
                <div className="card-tavern p-12 text-center border border-[var(--color-border)]">
                    <div className="text-4xl mb-3">🍺</div>
                    <h3 className="font-display text-2xl text-[var(--color-text)]">
                        No pubs found
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] max-w-sm mx-auto mt-1 mb-5">
                        {searchTerm
                            ? 'No pubs matched your current query or filters.'
                            : 'Your collective directory is currently empty. Add the first pub to get rolling!'}
                    </p>
                    <button
                        onClick={() => setIsAddPubOpen(true)}
                        className="btn-brand text-xs px-4 py-2 inline-flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Pub</span>
                    </button>
                </div>
            )}

            {/* Modals */}

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

            {/* 3. Inline Edit Pub Modal */}
            {editingPub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
                    <form
                        onSubmit={handleSaveEdit}
                        className="card-tavern bg-[var(--color-surface)] p-6 rounded-2xl w-full max-w-md border border-[var(--color-border)] shadow-2xl relative space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-display text-2xl text-[var(--color-text)]">
                                Edit Pub
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
                                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-brand)]"
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
                                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-offset)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-brand)]"
                            />
                        </div>

                        <div className="flex justify-end gap-2.5 pt-3 border-t border-[var(--color-divider)]">
                            <button
                                type="button"
                                onClick={() => setEditingPub(null)}
                                className="btn-tavern text-xs px-4 py-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isUpdating}
                                className="btn-brand text-xs px-4 py-2 font-bold"
                            >
                                {isUpdating ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 4. Secret Pub Reveal Modal */}
            {showSecretModal && secretPub && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="card-tavern bg-[var(--color-surface)] p-6 sm:p-8 rounded-3xl w-full max-w-md text-center border border-amber-500/30 shadow-2xl relative overflow-hidden">
                        <div className="text-5xl mb-3 animate-bounce">🎲</div>
                        <h3 className="font-display text-3xl text-[var(--color-brand)] mb-1">
                            The Tavern Oracle Has Spoken
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] mb-5">
                            Tonight&apos;s mystery rendezvous destination:
                        </p>

                        <div className="p-5 rounded-2xl bg-[var(--color-surface-offset)] border border-[var(--color-border)] mb-6 text-left space-y-2">
                            <h4 className="font-display text-2xl text-[var(--color-text)]">
                                {secretPub.name}
                            </h4>
                            <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
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
                                className="btn-tavern text-xs px-4 py-2.5"
                            >
                                Roll Again Later
                            </button>
                            <button
                                onClick={() => {
                                    setShowSecretModal(false);
                                    setSelectedPubForDetail(secretPub);
                                }}
                                className="btn-brand text-xs px-5 py-2.5 font-bold shadow-md"
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
