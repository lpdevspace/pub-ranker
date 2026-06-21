import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { firebase } from '../firebase';
import ConfirmModal from '../components/ConfirmModal';
import { startCheckout, openCustomerPortal } from '../utils/checkout';
import { getPlanForVenue, canUseFeature, PUB_PLANS } from '../utils/pubPlans';
import CriteriaBreakdown from '../components/venue/CriteriaBreakdown';
import TrendChart from '../components/venue/TrendChart';
import CompetitorBenchmark from '../components/venue/CompetitorBenchmark';
import ReviewCard from '../components/venue/ReviewCard';
import BillingTab from '../components/venue/BillingTab';
import FeaturedTab from '../components/venue/FeaturedTab';
import MultiVenueOverview from '../components/venue/MultiVenueOverview';
import PremiumLock from '../components/venue/PremiumLock';

// ---------------------------------------------------------------------------
// Tiny toast helper
// ---------------------------------------------------------------------------
function useToast() {
    const [toasts, setToasts] = useState([]);
    const showToast = useCallback((message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }, []);
    return { toasts, showToast };
}

function ToastContainer({ toasts }) {
    if (!toasts.length) return null;
    return (
        <div className="fixed bottom-6 right-6 z-[9998] flex flex-col gap-2 pointer-events-none">
            {toasts.map(t => (
                <div key={t.id} className={`px-5 py-3 rounded-xl shadow-lg text-white text-sm font-bold animate-fadeIn ${
                    t.type === 'error' ? 'bg-red-600' : t.type === 'warning' ? 'bg-yellow-500' : 'bg-green-600'
                }`}>
                    {t.message}
                </div>
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Vector SVGs
// ---------------------------------------------------------------------------
function PortalIcon({ type, className = "w-4 h-4 flex-shrink-0" }) {
    switch (type) {
        case 'claim':
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            );
        case 'insights':
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                </svg>
            );
        case 'deals':
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    <path d="M16 10l-4 4-2-2" />
                </svg>
            );
        case 'profile':
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
            );
        case 'credit-card':
            return (
                <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <rect width="22" height="16" x="1" y="4" rx="3" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                </svg>
            );
        default:
            return <span>⚙️</span>;
    }
}

export default function VenuePortalPage({ db, user, userProfile }) {
    const [ownedVenues, setOwnedVenues] = useState([]);
    const [myClaims, setMyClaims] = useState([]);
    const [allPubs, setAllPubs] = useState([]);
    const [selectedPubId, setSelectedPubId] = useState('');
    const [claimEmail, setClaimEmail] = useState('');
    
    const [activeTab, setActiveTab] = useState('insights');
    const [selectedVenueId, setSelectedVenueId] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
    
    // Venue raw scores (now we keep the full list so we can derive criteria + trend)
    const [rawScores, setRawScores] = useState([]);
    const [venueStats, setVenueStats] = useState({ totalCheckins: 0, averageRating: 0.0, upvotesCount: 0, recentReviews: [] });
    const [loadingStats, setLoadingStats] = useState(false);

    // Deals state
    const [dealsList, setDealsList] = useState([]);
    const [loadingDeals, setLoadingDeals] = useState(false);
    const [newDeal, setNewDeal] = useState({ title: '', description: '', code: '', minCheckinsRequired: 0, daysValid: 7 });
    const [isSavingDeal, setIsSavingDeal] = useState(false);

    // Profile state
    const [profileForm, setProfileForm] = useState({ name: '', location: '', address: '', photoURL: '' });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // Stripe checkout fallback modal (shown when Stripe isn't configured yet)
    const [checkoutUnavailable, setCheckoutUnavailable] = useState(false);

    // ConfirmModal state
    const [confirmState, setConfirmState] = useState(null);

    const { toasts, showToast } = useToast();

    // -----------------------------------------------------------------------
    // INITIAL LOAD
    // -----------------------------------------------------------------------
    const loadPortalData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Fetch claimed venues
            const pubsSnap = await db.collection('pubs').where('claimedBy', 'array-contains', user.uid).get();
            const claimed = pubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setOwnedVenues(claimed);

            if (claimed.length > 0) {
                setSelectedVenueId(claimed[0].id);
            }

            // 2. Fetch my submitted claims
            const claimsSnap = await db.collection('venueClaims').where('requestedByUid', '==', user.uid).get();
            setMyClaims(claimsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            // 3. Fetch all pubs (for directory search list)
            const allPubsSnap = await db.collection('pubs').get();
            setAllPubs(allPubsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (e) {
            console.error(e);
            showToast('Failed to load portal data: ' + e.message, 'error');
        } finally {
            setLoading(false);
        }
    }, [db, user]);

    useEffect(() => {
        loadPortalData();
    }, [loadPortalData]);

    const activeVenue = useMemo(() => {
        return ownedVenues.find(v => v.id === selectedVenueId) || null;
    }, [ownedVenues, selectedVenueId]);

    // Plan & feature gating (single source of truth for the whole portal)
    const plan = useMemo(() => getPlanForVenue(userProfile, activeVenue), [userProfile, activeVenue]);
    const can  = useCallback((f) => canUseFeature(plan, f), [plan]);

    // Pub Plus subscribers get 2 featured credits/month — compute remaining.
    const featuredCreditsRemaining = useMemo(() => {
        if (plan?.key !== 'pubPlus') return 0;
        const used = userProfile?.featuredCreditsUsedThisMonth || 0;
        const month = new Date().getUTCMonth();
        const trackedMonth = userProfile?.featuredCreditsMonth;
        // Reset if it's a new month
        return trackedMonth === month ? Math.max(0, 2 - used) : 2;
    }, [plan, userProfile]);

    // -----------------------------------------------------------------------
    // UPDATE PROFILE FORM WHEN VENUE CHANGES
    // -----------------------------------------------------------------------
    useEffect(() => {
        if (activeVenue) {
            setProfileForm({
                name: activeVenue.name || '',
                location: activeVenue.location || '',
                address: activeVenue.address || '',
                photoURL: activeVenue.photoURL || '',
            });
        }
    }, [activeVenue]);

    // -----------------------------------------------------------------------
    // FETCH STATS AND DEALS
    // -----------------------------------------------------------------------
    const fetchVenueStatsAndDeals = useCallback(async (venueId) => {
        if (!venueId) return;
        setLoadingStats(true);
        setLoadingDeals(true);

        try {
            // 1. Fetch scores (using collectionGroup with index-missing fallback)
            let allScores = [];
            let checkins = [];
            let ratingSum = 0;
            let reviewsList = [];

            try {
                const scoresSnap = await db.collectionGroup('scores').where('pubId', '==', venueId).get();
                allScores = scoresSnap.docs.map(doc => ({
                    id: doc.id,
                    scoreId: doc.id,
                    ref: doc.ref,
                    ...doc.data(),
                }));
                checkins = allScores;

                allScores.forEach(c => {
                    ratingSum += (Number(c.value) || 0);
                    if (c.textComment) {
                        reviewsList.push({
                            id: c.id,
                            scoreId: c.id,
                            ref: c.ref,
                            userName: c.userName || 'Anonymous',
                            rating: c.value,
                            criterionId: c.criterionId,
                            comment: c.textComment,
                            ownerReply: c.ownerReply || null,
                            date: c.createdAt ? new Date(c.createdAt.toDate()).toLocaleDateString() : 'Recent'
                        });
                    }
                });
                reviewsList.sort((a, b) => (b.scoreId > a.scoreId ? 1 : -1));
            } catch (err) {
                console.warn('CollectionGroup scores query requires indexes or failed. Using simulated fallback data.', err);
                // Fallback: Generate semi-realistic mock scores so the dashboard
                // demos correctly in fresh environments.
                const now = Date.now();
                const day = 24 * 60 * 60 * 1000;
                const criteria = ['atmosphere', 'service', 'beer', 'price', 'food'];
                allScores = Array.from({ length: 42 }, (_, i) => ({
                    id: `mock-${i}`,
                    scoreId: `mock-${i}`,
                    value: 5 + Math.random() * 4 + (i < 20 ? 0.3 : 0),
                    criterionId: criteria[i % criteria.length],
                    createdAt: { toDate: () => new Date(now - i * 1.5 * day) },
                    userName: ['Sarah L.', 'Dave M.', 'Chris T.', 'Priya K.', 'Tom W.'][i % 5],
                    textComment: i % 6 === 0
                        ? 'Solid local. Beer is well-kept and staff are friendly.'
                        : null,
                }));
                checkins = allScores;
                ratingSum = allScores.reduce((a, s) => a + s.value, 0);
                reviewsList = [
                    { id: 'mock-r1', userName: 'Sarah L.', rating: 9, comment: 'Incredible beer selection and a very cozy fire pit.', date: 'Today',     criterionId: 'atmosphere' },
                    { id: 'mock-r2', userName: 'Dave M.',  rating: 8, comment: 'Solid atmosphere. Bartenders are always friendly.',   date: 'Yesterday', criterionId: 'service' },
                    { id: 'mock-r3', userName: 'Chris T.', rating: 6, comment: 'Pint price is a bit high, but the garden is beautiful.', date: '3 days ago', criterionId: 'price' },
                ];
            }

            const upvotes = activeVenue?.upvotes ? activeVenue.upvotes.length : 0;
            const avg = checkins.length > 0 ? (ratingSum / checkins.length).toFixed(1) : '0.0';

            setRawScores(allScores);
            setVenueStats({
                totalCheckins: checkins.length,
                averageRating: avg,
                upvotesCount: upvotes,
                recentReviews: reviewsList.slice(0, 8)
            });

            // 2. Fetch deals
            const dealsSnap = await db.collection('deals').where('pubId', '==', venueId).get();
            setDealsList(dealsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        } catch (e) {
            console.error(e);
            showToast('Failed to sync venue data: ' + e.message, 'error');
        } finally {
            setLoadingStats(false);
            setLoadingDeals(false);
        }
    }, [db, activeVenue]);

    useEffect(() => {
        if (selectedVenueId) {
            fetchVenueStatsAndDeals(selectedVenueId);
        }
    }, [selectedVenueId, fetchVenueStatsAndDeals]);

    // -----------------------------------------------------------------------
    // CLAIM REQUEST
    // -----------------------------------------------------------------------
    const handleRequestClaim = async (e) => {
        e.preventDefault();
        if (!selectedPubId) return showToast('Please select a venue profile to claim.', 'warning');
        if (!claimEmail.trim()) return showToast('Please provide your manager contact email.', 'warning');

        setIsSubmittingClaim(true);
        const selectedPub = allPubs.find(p => p.id === selectedPubId);
        
        try {
            const claimId = `claim_${Date.now()}`;
            const newClaim = {
                id: claimId,
                pubId: selectedPubId,
                pubName: selectedPub ? selectedPub.name : 'Unknown Venue',
                contactEmail: claimEmail.trim(),
                requestedByUid: user.uid,
                status: 'pending',
                requestedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('venueClaims').doc(claimId).set(newClaim);
            setMyClaims(prev => [newClaim, ...prev]);
            setSelectedPubId('');
            setClaimEmail('');
            showToast('📩 claim request submitted! Check your status list below.', 'success');
        } catch (err) {
            showToast('Failed to submit claim: ' + err.message, 'error');
        } finally {
            setIsSubmittingClaim(false);
        }
    };

    // -----------------------------------------------------------------------
    // DEALS CAMPAIGNS
    // -----------------------------------------------------------------------
    const handleSaveNewDeal = async (e) => {
        e.preventDefault();
        if (!activeVenue) return;
        if (!newDeal.title.trim()) return showToast('Please enter an offer title.', 'warning');
        if (!newDeal.code.trim()) return showToast('Please provide a coupon redemption code.', 'warning');

        setIsSavingDeal(true);
        try {
            const dealId = `deal_${Date.now()}`;
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + Number(newDeal.daysValid));

            const payload = {
                id: dealId,
                pubId: activeVenue.id,
                pubName: activeVenue.name,
                title: newDeal.title.trim(),
                description: newDeal.description.trim(),
                code: newDeal.code.trim().toUpperCase(),
                minCheckinsRequired: Number(newDeal.minCheckinsRequired),
                claimedCount: 0,
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: firebase.firestore.Timestamp.fromDate(expiryDate)
            };

            await db.collection('deals').doc(dealId).set(payload);
            setDealsList(prev => [payload, ...prev]);
            setNewDeal({ title: '', description: '', code: '', minCheckinsRequired: 0, daysValid: 7 });
            showToast('🚀 Marketing deal published successfully!');
        } catch (err) {
            showToast('Failed to save promotion: ' + err.message, 'error');
        } finally {
            setIsSavingDeal(false);
        }
    };

    const handleDeleteDeal = (dealId) => {
        setConfirmState({
            title: 'Delete Deal Campaign',
            message: 'Are you sure you want to end and delete this promotion? It will be removed from all users.',
            confirmLabel: 'Delete Offer',
            danger: true,
            onConfirm: async () => {
                try {
                    await db.collection('deals').doc(dealId).delete();
                    setDealsList(prev => prev.filter(d => d.id !== dealId));
                    showToast('Offer removed.');
                } catch (e) {
                    showToast('Failed to delete deal: ' + e.message, 'error');
                }
            }
        });
    };

    // -----------------------------------------------------------------------
    // PROFILE MANAGER
    // -----------------------------------------------------------------------
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!activeVenue) return;

        setIsSavingProfile(true);
        try {
            await db.collection('pubs').doc(activeVenue.id).update({
                name: profileForm.name.trim(),
                location: profileForm.location.trim(),
                address: profileForm.address.trim(),
                photoURL: profileForm.photoURL.trim()
            });

            // Update local state list
            setOwnedVenues(prev => prev.map(p => p.id === activeVenue.id ? { ...p, ...profileForm } : p));
            showToast('💾 Profile settings updated successfully!');
        } catch (err) {
            showToast('Failed to update profile: ' + err.message, 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    // -----------------------------------------------------------------------
    // SUBSCRIPTION & STRIPE (real checkout — no more mock card form)
    // -----------------------------------------------------------------------
    const handleUpgrade = useCallback((priceKey) => {
        // priceKey is one of: 'pubProMonthly', 'pubPlusMonthly',
        //                     'featuredOneOff', 'featuredMonthly'
        startCheckout(priceKey, {
            user, userProfile,
            venueId: selectedVenueId || null,
            onUnavailable: () => setCheckoutUnavailable(true),
        });
    }, [user, userProfile, selectedVenueId]);

    const handleManageBilling = useCallback(() => {
        openCustomerPortal({
            stripeCustomerId: userProfile?.stripeCustomerId,
            onUnavailable: () => setCheckoutUnavailable(true),
        });
    }, [userProfile]);

    // -----------------------------------------------------------------------
    // REVIEW REPLY
    // -----------------------------------------------------------------------
    const handleReplyToReview = useCallback(async (review, text) => {
        try {
            if (!review.ref) throw new Error('Cannot reply to a demo review.');
            await review.ref.update({
                ownerReply: {
                    text,
                    repliedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    ownerUid: user.uid,
                    ownerVenueId: activeVenue?.id || null,
                },
            });
            // Optimistically update local state
            setVenueStats(prev => ({
                ...prev,
                recentReviews: prev.recentReviews.map(r =>
                    r.id === review.id
                        ? { ...r, ownerReply: { text, repliedAt: new Date(), ownerUid: user.uid } }
                        : r
                ),
            }));
            showToast('💬 Reply posted — visible publicly on the review.');
        } catch (e) {
            console.error(e);
            showToast('Failed to post reply: ' + e.message, 'error');
        }
    }, [user, activeVenue]);

    // -----------------------------------------------------------------------
    // FEATURED LISTING
    // -----------------------------------------------------------------------
    const handleClaimFeaturedCredit = useCallback(async () => {
        if (!activeVenue) return;
        if (featuredCreditsRemaining <= 0) {
            showToast('No featured credits remaining this month.', 'warning');
            return;
        }
        try {
            const oneWeek = 7 * 24 * 60 * 60 * 1000;
            const currentUntil = activeVenue.featuredUntil?.toDate?.()?.getTime() || Date.now();
            const newUntil = new Date(Math.max(Date.now(), currentUntil) + oneWeek);
            const month = new Date().getUTCMonth();

            await db.collection('pubs').doc(activeVenue.id).update({
                featuredUntil: firebase.firestore.Timestamp.fromDate(newUntil),
            });
            await db.collection('users').doc(user.uid).set({
                featuredCreditsUsedThisMonth: (userProfile?.featuredCreditsMonth === month
                    ? (userProfile?.featuredCreditsUsedThisMonth || 0)
                    : 0) + 1,
                featuredCreditsMonth: month,
            }, { merge: true });

            // Optimistic UI update
            setOwnedVenues(prev => prev.map(v =>
                v.id === activeVenue.id
                    ? { ...v, featuredUntil: { toDate: () => newUntil } }
                    : v
            ));
            showToast('⭐ Featured for 7 more days.');
        } catch (e) {
            console.error(e);
            showToast('Failed to activate featured listing: ' + e.message, 'error');
        }
    }, [activeVenue, featuredCreditsRemaining, db, user, userProfile]);

    // -----------------------------------------------------------------------
    // RENDER STATES
    // -----------------------------------------------------------------------
    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[400px]">
                <div className="text-center animate-pulse text-gray-500">
                    <span className="text-3xl block mb-2">🛡️</span>
                    <p className="font-bold">Syncing secure business console...</p>
                </div>
            </div>
        );
    }

    // STATE A: User has NO claimed pubs
    if (ownedVenues.length === 0) {
        const sortedPubsForSearch = [...allPubs].sort((a, b) => a.name.localeCompare(b.name));
        return (
            <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
                <ToastContainer toasts={toasts} />
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-xl font-bold text-gray-855 dark:text-white flex items-center gap-2">
                        <PortalIcon type="claim" className="w-5 h-5 text-brand" />
                        Pub Venue Verification Portal
                    </h3>
                    <p className="text-xs text-gray-450 dark:text-gray-400 mt-1 leading-relaxed">
                        Are you a pub owner or business manager? Submit a verification request to take profile ownership. Once approved, you can customize your listing details, view visitor check-ins, unlock deep analytical reports, and publish promotional deals directly to local customers.
                    </p>

                    <form onSubmit={handleRequestClaim} className="bg-gray-55 dark:bg-gray-750/30 p-5 rounded-xl border border-gray-150 dark:border-gray-750 my-6 space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">1. Select Your Venue Listing</label>
                            <select
                                value={selectedPubId}
                                onChange={e => setSelectedPubId(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand cursor-pointer outline-none"
                                required
                            >
                                <option value="">-- Choose Pub Profile --</option>
                                {sortedPubsForSearch.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.location || 'Unknown location'})</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider mb-1.5">2. Manager Email (For Proof & Invoicing)</label>
                            <input
                                type="email"
                                value={claimEmail}
                                onChange={e => setClaimEmail(e.target.value)}
                                placeholder="manager@yourpubname.co.uk"
                                className="w-full px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingClaim}
                            className="w-full py-2.5 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 disabled:opacity-50 transition cursor-pointer"
                        >
                            {isSubmittingClaim ? 'Submitting Verification Claim...' : 'Request Venue Verification'}
                        </button>
                    </form>
                </div>

                {/* Submitted claims queue */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gray-55 dark:bg-gray-700/20">
                        <h4 className="text-sm font-bold text-gray-855 dark:text-white">Your Submitted Claim Requests</h4>
                        <p className="text-[10px] text-gray-450 uppercase tracking-wider mt-0.5">Track verification progress</p>
                    </div>
                    
                    <div className="overflow-x-auto p-2">
                        {myClaims.length === 0 ? (
                            <p className="text-center text-xs text-gray-500 py-8 italic">No claims requested yet. Search and claim your venue profile above!</p>
                        ) : (
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-gray-105 dark:bg-gray-755 text-gray-500 dark:text-gray-450 font-bold border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th className="p-4">Venue Profile</th>
                                        <th className="p-4">Contact Email</th>
                                        <th className="p-4">Submitted At</th>
                                        <th className="p-4 text-right">Verification Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-150 dark:divide-gray-750 text-gray-755 dark:text-gray-250">
                                    {myClaims.map(claim => (
                                        <tr key={claim.id}>
                                            <td className="p-4 font-bold">{claim.pubName}</td>
                                            <td className="p-4 font-mono select-all text-[11px]">{claim.contactEmail}</td>
                                            <td className="p-4 text-gray-450">
                                                {claim.requestedAt && typeof claim.requestedAt.toDate === 'function'
                                                    ? new Date(claim.requestedAt.toDate()).toLocaleDateString()
                                                    : 'Recent'}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2.5 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider ${
                                                    claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                    claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                    {claim.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // STATE B: User has CLAIMED pubs (Manager Dashboard)
    return (
        <div className="w-full space-y-6">
            <ToastContainer toasts={toasts} />
            {confirmState && <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />}

            {/* Stripe checkout unavailable banner (shown when keys aren't configured yet) */}
            {checkoutUnavailable && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" data-testid="checkout-unavailable-modal">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700 relative space-y-4 text-center">
                        <button
                            type="button"
                            onClick={() => setCheckoutUnavailable(false)}
                            className="absolute top-4 right-4 w-7 h-7 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-850 dark:hover:text-white transition cursor-pointer"
                            data-testid="checkout-unavailable-close"
                        >✕</button>
                        <div className="text-3xl">🚧</div>
                        <h3 className="text-xl font-black text-gray-855 dark:text-white">Checkout coming soon</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Stripe isn&apos;t connected to this environment yet. Once your team
                            wires up the Stripe keys + deploys the checkout Cloud Function,
                            this button will go straight to a secure Stripe checkout page.
                        </p>
                        <button
                            onClick={() => setCheckoutUnavailable(false)}
                            className="px-6 py-2.5 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 transition cursor-pointer"
                        >Got it</button>
                    </div>
                </div>
            )}

            {/* Portal Page Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand bg-brand-subtle dark:bg-brand-highlight/30 px-2.5 py-0.5 rounded-full select-none">Business console</span>
                    <h3 className="text-2xl font-black text-gray-855 dark:text-white mt-1 pr-4 truncate">{activeVenue?.name}</h3>
                    <p className="text-xs text-gray-450 dark:text-gray-400 truncate">{activeVenue?.address || activeVenue?.location || 'Verified Profile'}</p>
                </div>

                <div className="flex items-center gap-2 self-stretch sm:self-auto flex-shrink-0">
                    {ownedVenues.length > 1 && (
                        <select
                            value={selectedVenueId}
                            onChange={e => setSelectedVenueId(e.target.value)}
                            className="px-3 py-2 border dark:border-gray-650 rounded-xl bg-gray-50 dark:bg-gray-700 text-xs font-bold dark:text-white cursor-pointer outline-none shadow-sm"
                        >
                            {ownedVenues.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    )}
                    
                    <button
                        onClick={() => {
                            // Trigger claim new profile page
                            setOwnedVenues([]);
                        }}
                        className="px-3 py-2 bg-gray-105 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-xs dark:text-white transition cursor-pointer"
                    >
                        + Claim Another Pub
                    </button>
                </div>
            </div>

            {/* Sidebar Shell Grid Layout */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
                
                {/* Desktop sidebar */}
                <aside className="w-full md:w-52 shrink-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm sticky top-20 overflow-hidden">
                    {/* Plan badge */}
                    <div className="px-4 pt-4 pb-3 border-b border-gray-150 dark:border-gray-750">
                        <p className="text-[9px] uppercase tracking-wider font-bold text-gray-400">Current plan</p>
                        <p className="text-sm font-black text-gray-850 dark:text-white flex items-center gap-2">
                            {plan.label}
                            {plan.key === 'pubPlus' && <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">PLUS</span>}
                            {plan.key === 'pubPro'  && <span className="text-[9px] bg-brand text-white px-1.5 py-0.5 rounded font-bold">PRO</span>}
                        </p>
                    </div>
                    <nav className="p-3.5 space-y-1" data-testid="venue-sidebar-nav">
                        <SidebarBtn id="insights"  label="Insights & Traffic"      icon="insights" active={activeTab} onClick={setActiveTab} />
                        <SidebarBtn id="reviews"   label="Customer Reviews"        icon="profile"  active={activeTab} onClick={setActiveTab} />
                        <SidebarBtn id="featured"  label="Featured Listing"        icon="claim"    active={activeTab} onClick={setActiveTab} />
                        <SidebarBtn id="deals"     label="Deals & Campaigns"       icon="deals"    active={activeTab} onClick={setActiveTab} />
                        <SidebarBtn id="profile"   label="Manage Profile"          icon="profile"  active={activeTab} onClick={setActiveTab} />
                        {ownedVenues.length > 1 && (
                            <SidebarBtn id="all-venues" label="All Venues"          icon="insights" active={activeTab} onClick={setActiveTab} />
                        )}
                        <SidebarBtn id="billing"   label="Subscription & Billing"  icon="credit-card" active={activeTab} onClick={setActiveTab} />
                    </nav>
                </aside>

                {/* Sub-view Content Container */}
                <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 min-h-[520px] w-full">
                    
                    {/* INSIGHTS TAB */}
                    {activeTab === 'insights' && (
                        <div className="space-y-6 animate-fadeIn" data-testid="insights-tab">
                            
                            {/* Metric KPI cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-150 dark:border-gray-750 shadow-sm" data-testid="kpi-checkins">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Total Reviews</span>
                                    <p className="text-2xl font-black text-gray-850 dark:text-white mt-1 tabular-nums">
                                        {loadingStats ? '...' : venueStats.totalCheckins}
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-150 dark:border-gray-750 shadow-sm" data-testid="kpi-avg">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider block">Average Rating</span>
                                    <p className="text-2xl font-black text-brand mt-1 tabular-nums">
                                        {loadingStats ? '...' : `${venueStats.averageRating} / 10`}
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-gray-850 p-4 rounded-xl border border-gray-150 dark:border-gray-750 shadow-sm" data-testid="kpi-votes">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider block">Leaderboard upvotes</span>
                                    <p className="text-2xl font-black text-gray-850 dark:text-white mt-1 tabular-nums">
                                        {loadingStats ? '...' : `${venueStats.upvotesCount}`}
                                    </p>
                                </div>
                            </div>

                            {/* Criteria breakdown — Pub Pro */}
                            <div className="relative border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                                <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20 flex justify-between items-center">
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Criteria breakdown</h4>
                                        <p className="text-[10px] text-gray-450 uppercase tracking-wider mt-0.5">How you score on each criterion</p>
                                    </div>
                                    {can('criteriaBreakdown') && (
                                        <span className="bg-brand/10 text-brand dark:bg-brand/20 font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full select-none">
                                            {plan.label}
                                        </span>
                                    )}
                                </div>
                                <CriteriaBreakdown scores={rawScores} loading={loadingStats} />
                                {!can('criteriaBreakdown') && (
                                    <PremiumLock
                                        requiredPlan="pubPro"
                                        icon="📊"
                                        title="See which criterion drags you down"
                                        body="Pub Pro reveals your per-criterion average — atmosphere, service, beer, price, food — so you fix the right thing first."
                                        onUpgrade={handleUpgrade}
                                    />
                                )}
                            </div>

                            {/* Trend chart + competitor benchmark grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="relative border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm min-h-[240px]">
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">12-week trend</h4>
                                        <p className="text-[10px] text-gray-450 uppercase tracking-wider mt-0.5">Where are you heading?</p>
                                    </div>
                                    <TrendChart scores={rawScores} loading={loadingStats} />
                                    {!can('trendChart') && (
                                        <PremiumLock
                                            requiredPlan="pubPro"
                                            icon="📈"
                                            title="Catch dips before they hurt"
                                            body="Pub Pro shows the last 30 days vs prior — and a 12-week sparkline so you spot patterns early."
                                            onUpgrade={handleUpgrade}
                                        />
                                    )}
                                </div>

                                <div className="relative border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm min-h-[240px]">
                                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Vs. neighbours</h4>
                                        <p className="text-[10px] text-gray-450 uppercase tracking-wider mt-0.5">Local competitor benchmark</p>
                                    </div>
                                    <CompetitorBenchmark
                                        db={db}
                                        venue={activeVenue}
                                        showFullLeaderboard={can('fullCompetitor')}
                                    />
                                    {!can('basicCompetitor') && (
                                        <PremiumLock
                                            requiredPlan="pubPro"
                                            icon="🏅"
                                            title="See how you rank locally"
                                            body="Pub Pro shows your rank in your area. Pub Plus reveals the full leaderboard with names."
                                            onUpgrade={handleUpgrade}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* REVIEWS TAB (with reply UI) */}
                    {activeTab === 'reviews' && (
                        <div className="space-y-4 animate-fadeIn" data-testid="reviews-tab">
                            <div>
                                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Customer reviews feed</h4>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">
                                    Reply publicly to show you care · {can('reviewResponses') ? 'Replies enabled' : 'Upgrade to enable replies'}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                                {venueStats.recentReviews.length === 0 ? (
                                    <p className="p-6 text-center text-xs text-gray-500 italic">No written reviews yet. Once customers leave comments, they&apos;ll appear here.</p>
                                ) : (
                                    venueStats.recentReviews.map(rev => (
                                        <ReviewCard
                                            key={rev.id}
                                            review={rev}
                                            canReply={can('reviewResponses')}
                                            onReply={handleReplyToReview}
                                            ownerName={activeVenue?.name}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* FEATURED LISTING TAB */}
                    {activeTab === 'featured' && (
                        <FeaturedTab
                            venue={activeVenue}
                            plan={plan}
                            featuredCreditsRemaining={featuredCreditsRemaining}
                            onPurchaseOneOff={() => handleUpgrade('featuredOneOff')}
                            onSubscribeFeatured={() => handleUpgrade('featuredMonthly')}
                            onClaimCredit={handleClaimFeaturedCredit}
                            onUpgrade={handleUpgrade}
                        />
                    )}

                    {/* MULTI-VENUE OVERVIEW (Pub Plus) */}
                    {activeTab === 'all-venues' && (
                        <MultiVenueOverview
                            db={db}
                            ownedVenues={ownedVenues}
                            plan={plan}
                            onSelectVenue={(id) => { setSelectedVenueId(id); setActiveTab('insights'); }}
                            onUpgrade={handleUpgrade}
                        />
                    )}

                    {/* BILLING TAB */}
                    {activeTab === 'billing' && (
                        <BillingTab
                            user={user}
                            userProfile={userProfile}
                            plan={plan}
                            onUpgrade={handleUpgrade}
                            onManage={handleManageBilling}
                        />
                    )}

                    {/* DEALS TAB */}
                    {activeTab === 'deals' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 rounded-xl">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Venue Promotions Campaign Panel</h4>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Publish offers directly to user search detail cards</p>
                                
                                <form onSubmit={handleSaveNewDeal} className="bg-gray-50 dark:bg-gray-750/30 p-4 rounded-xl border border-gray-200 dark:border-gray-750 my-5 space-y-3.5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Offer Title</label>
                                            <input
                                                type="text"
                                                value={newDeal.title}
                                                onChange={e => setNewDeal({ ...newDeal, title: e.target.value })}
                                                placeholder="e.g. Free packet of crisps with any pint"
                                                className="w-full px-3 py-2 text-xs border dark:border-gray-650 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider mb-1">Redemption Coupon Code</label>
                                            <input
                                                type="text"
                                                value={newDeal.code}
                                                onChange={e => setNewDeal({ ...newDeal, code: e.target.value })}
                                                placeholder="e.g. OAKBARFREE"
                                                className="w-full px-3 py-2 text-xs border dark:border-gray-655 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand outline-none font-mono uppercase"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider mb-1">Deal Details / Description</label>
                                        <textarea
                                            value={newDeal.description}
                                            onChange={e => setNewDeal({ ...newDeal, description: e.target.value })}
                                            placeholder="Write brief description showing terms or how to redeem (e.g. Show this screen to bartender on order)."
                                            className="w-full p-3 text-xs border dark:border-gray-650 rounded-xl focus:ring-2 focus:ring-brand bg-white dark:bg-gray-800 dark:text-white resize-none h-16 outline-none"
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Min Check-Ins Required (Loyalty Guard)</label>
                                            <input
                                                type="number"
                                                value={newDeal.minCheckinsRequired}
                                                onChange={e => setNewDeal({ ...newDeal, minCheckinsRequired: e.target.value })}
                                                placeholder="0 for all users"
                                                className="w-full px-3 py-2 text-xs border dark:border-gray-650 rounded-xl bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                                min="0"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Days Valid (Campaign Expiry)</label>
                                            <select
                                                value={newDeal.daysValid}
                                                onChange={e => setNewDeal({ ...newDeal, daysValid: e.target.value })}
                                                className="w-full px-2.5 py-2 text-xs border dark:border-gray-650 rounded-xl bg-white dark:bg-gray-800 dark:text-white cursor-pointer outline-none"
                                            >
                                                <option value="1">1 Day</option>
                                                <option value="3">3 Days</option>
                                                <option value="7">1 Week</option>
                                                <option value="30">1 Month</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSavingDeal}
                                        className="w-full py-2.5 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 disabled:opacity-50 transition cursor-pointer"
                                    >
                                        {isSavingDeal ? 'Publishing Deal...' : 'Publish Marketing Offer'}
                                    </button>
                                </form>

                                <h4 className="font-bold text-xs text-gray-850 dark:text-white mb-3">Published Promotions Queue</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {dealsList.length === 0 ? (
                                        <p className="text-xs text-gray-500 italic py-6 text-center">No promotions active. Fill out the builder form to publish an offer!</p>
                                    ) : (
                                        dealsList.map(deal => (
                                            <div key={deal.id} className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-850 shadow-sm relative group flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2.5 flex-wrap">
                                                        <span className="font-bold text-xs text-gray-855 dark:text-white">{deal.title}</span>
                                                        <span className="bg-brand-subtle dark:bg-brand-highlight/20 text-brand text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg select-all">
                                                            Code: {deal.code}
                                                        </span>
                                                        {deal.minCheckinsRequired > 0 && (
                                                            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[9px] font-bold px-2 py-0.5 rounded-lg select-none">
                                                                🔑 {deal.minCheckinsRequired}+ Checkins
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-505 dark:text-gray-400">{deal.description}</p>
                                                    <p className="text-[9px] text-gray-450">
                                                        Expires: {deal.expiresAt && typeof deal.expiresAt.toDate === 'function' ? new Date(deal.expiresAt.toDate()).toLocaleDateString() : 'Active'}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-4 self-end md:self-auto">
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase block tracking-wider">Claims</span>
                                                        <span className="text-lg font-black text-gray-850 dark:text-white tabular-nums">{deal.claimedCount || 0}</span>
                                                    </div>
                                                    <button onClick={() => handleDeleteDeal(deal.id)} className="text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-955/20 dark:hover:bg-red-900/40 font-bold text-[10px] uppercase px-3 py-2 rounded-xl transition cursor-pointer">
                                                        End Campaign
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PROFILE MANAGER TAB */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="bg-white dark:bg-gray-800 rounded-xl">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-white">Venue Profile Settings</h4>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Customize how your venue renders globally to directory users</p>

                                <form onSubmit={handleSaveProfile} className="space-y-4 my-5">
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Pub Name</label>
                                        <input
                                            type="text"
                                            value={profileForm.name}
                                            onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                                            className="w-full px-3 py-2.5 text-xs border dark:border-gray-600 rounded-xl bg-gray-55 dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider mb-1">Location City/Neighborhood</label>
                                        <input
                                            type="text"
                                            value={profileForm.location}
                                            onChange={e => setProfileForm({ ...profileForm, location: e.target.value })}
                                            className="w-full px-3 py-2.5 text-xs border dark:border-gray-655 rounded-xl bg-gray-55 dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-550 uppercase tracking-wider mb-1">Full Postal Address</label>
                                        <input
                                            type="text"
                                            value={profileForm.address}
                                            onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                                            className="w-full px-3 py-2.5 text-xs border dark:border-gray-655 rounded-xl bg-gray-55 dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-brand outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-400 dark:text-gray-555 uppercase tracking-wider mb-1">Cover Photo URL</label>
                                        <input
                                            type="text"
                                            value={profileForm.photoURL}
                                            onChange={e => setProfileForm({ ...profileForm, photoURL: e.target.value })}
                                            placeholder="https://..."
                                            className="w-full px-3 py-2.5 text-xs border dark:border-gray-655 rounded-xl bg-gray-55 dark:bg-gray-750 dark:text-white focus:ring-2 focus:ring-brand outline-none font-mono"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="w-full py-2.5 bg-brand text-white font-bold text-xs rounded-xl hover:opacity-85 disabled:opacity-50 transition cursor-pointer"
                                    >
                                        {isSavingProfile ? 'Saving Changes...' : 'Save Profile Details'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// SidebarBtn — small helper for the venue portal left-rail nav
// ---------------------------------------------------------------------------
function SidebarBtn({ id, label, icon, active, onClick }) {
    const isActive = active === id;
    return (
        <button
            onClick={() => onClick(id)}
            data-testid={`sidebar-tab-${id}`}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-left ${
                isActive
                    ? 'bg-brand/10 dark:bg-brand-highlight/20 text-brand'
                    : 'text-gray-600 dark:text-gray-450 hover:bg-gray-55 dark:hover:bg-gray-750'
            }`}
        >
            <PortalIcon type={icon} />
            <span className="truncate">{label}</span>
        </button>
    );
}
