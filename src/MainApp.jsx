import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { auth, db, firebase } from './firebase';
import { LoadingScreen } from './App';

import Header from './components/header';
import OnboardingModal from './components/OnboardingModal';

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MapPage = lazy(() => import('./pages/MapPage'));
const PubsPage = lazy(() => import('./pages/PubsPage'));
const PubsToVisitPage = lazy(() => import('./pages/PubsToVisitPage'));
const RateView = lazy(() => import('./pages/RateView'));
const EditPubView = lazy(() => import('./pages/EditPubView'));
const IndividualRankingsPage = lazy(() => import('./pages/IndividualRankingsPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const SpinTheWheelPage = lazy(() => import('./pages/SpinTheWheelPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const SuperAdminPage = lazy(() => import('./pages/SuperAdminPage'));
const FeedbackPage = lazy(() => import('./pages/FeedbackPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const TaproomPage = lazy(() => import('./pages/TaproomPage'));
const InsightsPage = lazy(() => import('./pages/InsightsPage'));
const VenuePortalPage = lazy(() => import('./pages/VenuePortalPage'));

export default function MainApp({ user, userProfile, groupId, auth, db, isDarkMode, toggleDarkMode, featureFlags }) {
    const navigate = useNavigate();
    const location = useLocation();

    const page = location.pathname.substring(1) || "dashboard";
    const setPage = (targetPage) => navigate(`/${targetPage}`);

    const [currentPub, setCurrentPub] = useState(null);
    const [editingPub, setEditingPub] = useState(null);

    const groupRef = useMemo(() => db.collection('groups').doc(groupId), [groupId, db]);
    const pubsRef = useMemo(() => groupRef.collection('pubs'), [groupRef]);
    const criteriaRef = useMemo(() => groupRef.collection('criteria'), [groupRef]);
    const scoresQuery = useMemo(() => db.collectionGroup('scores').where('groupId', '==', groupId), [groupId, db]);

    const [currentGroup, setCurrentGroup] = useState(null);
    const [pubs, setPubs] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [scores, setScores] = useState({});
    const [allUsers, setAllUsers] = useState({});
    const [dataLoading, setDataLoading] = useState(true);

    const canManageGroup = useMemo(() => {
        if (!currentGroup) return false;
        const groupOwnerId = currentGroup?.ownerUid || null;
        const currentUserId = user?.uid || null;
        const isOwner = !!groupOwnerId && !!currentUserId && groupOwnerId === currentUserId;
        const isManager = currentGroup.managers?.includes(currentUserId);
        return isOwner || isManager;
    }, [currentGroup, user.uid]);

    useEffect(() => {
        const unsubscribe = groupRef.onSnapshot((doc) => {
            if (doc.exists) setCurrentGroup({ id: doc.id, ...doc.data() });
            else db.collection('users').doc(user.uid).update({ activeGroupId: null });
        }, (error) => console.error("Error fetching group info:", error));
        return unsubscribe;
    }, [groupRef, user.uid, db]);

    useEffect(() => {
        setDataLoading(true);
        pubsRef.get().then((snapshot) => {
            setPubs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setDataLoading(false);
        }).catch((error) => {
            console.error("Error fetching pubs:", error);
            setDataLoading(false);
        });
    }, [pubsRef]);

    useEffect(() => {
        criteriaRef.get().then((snapshot) => {
            let criteriaData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            criteriaData.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setCriteria(criteriaData);
        }).catch((error) => console.error("Error fetching criteria:", error));
    }, [criteriaRef]);

    useEffect(() => {
        const unsubscribe = scoresQuery.onSnapshot((snapshot) => {
            const scoresData = {};
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                data.id = doc.id; 
                const { pubId, userId, criterionId } = data;
                if (!pubId || !criterionId) return;
                if (!scoresData[pubId]) scoresData[pubId] = {};
                if (!scoresData[pubId][criterionId]) scoresData[pubId][criterionId] = [];
                const userScoreIndex = scoresData[pubId][criterionId].findIndex((s) => s.userId === userId);
                if (userScoreIndex > -1) scoresData[pubId][criterionId][userScoreIndex] = data;
                else scoresData[pubId][criterionId].push(data);
            });
            setScores(scoresData);
        }, (error) => console.error("Error fetching scores:", error));
        return unsubscribe;
    }, [scoresQuery]);

    // --- FIX 1: Only fetch users who are members of the current group.
    //    Runs once after currentGroup loads. Firestore 'in' supports up to 30 values;
    //    for larger groups a Cloud Function or batching would be needed.
    useEffect(() => {
        if (!db || !currentGroup) return;

        const memberIds = Array.isArray(currentGroup.members) ? currentGroup.members : [];
        // Always include the current user in case they're not in the members array yet
        const idsToFetch = Array.from(new Set([...memberIds, user.uid]));

        if (idsToFetch.length === 0) return;

        // Firestore 'in' queries are limited to 30 items per query
        const BATCH_SIZE = 30;
        const batches = [];
        for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
            batches.push(idsToFetch.slice(i, i + BATCH_SIZE));
        }

        Promise.all(
            batches.map(batch =>
                db.collection('users')
                    .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
                    .get()
            )
        ).then(snapshots => {
            const usersData = {};
            snapshots.forEach(snapshot => {
                snapshot.docs.forEach(doc => { usersData[doc.id] = doc.data(); });
            });
            setAllUsers(usersData);
        }).catch(error => console.error("Error fetching group members:", error));
    }, [db, currentGroup, user.uid]);

    const activeCriteria = useMemo(() => criteria.filter((c) => !c.archived), [criteria]);
    const visitedPubs = useMemo(() => pubs.filter((p) => p.status === 'visited'), [pubs]);
    const newPubs = useMemo(() => pubs.filter((p) => p.status !== 'visited'), [pubs]);

    const criteriaWeightMap = useMemo(() => {
        return criteria.reduce((acc, c) => {
            acc[c.id] = c.weight ?? 1 > 0 ? c.weight ?? 1 : 1;
            return acc;
        }, {});
    }, [criteria]);

    const rankedVisitedPubs = useMemo(() => {
        const pubScores = visitedPubs.map((pub) => {
            let totalScore = 0; let totalWeight = 0; let yesNoData = {};
            const pubScoresData = scores[pub.id] ?? {};
            Object.entries(pubScoresData).forEach(([criterionId, criterionScores]) => {
                let hasYes = false;
                const weight = criteriaWeightMap[criterionId] ?? 1;
                criterionScores.forEach((score) => {
                    if (score.type === 'scale' && score.value !== null) { totalScore += score.value * weight; totalWeight += weight; }
                    else if (score.type === 'price' && score.value !== null) { totalScore += (score.value * 2) * weight; totalWeight += weight; }
                    if (score.type === 'yes-no' && score.value === true) hasYes = true;
                });
                if (hasYes) yesNoData[criterionId] = true;
            });
            return { ...pub, avgScore: totalWeight > 0 ? totalScore / totalWeight : 0, yesNoData };
        });
        return pubScores.sort((a, b) => b.avgScore - a.avgScore);
    }, [visitedPubs, scores, criteriaWeightMap]);

    const activeRaters = useMemo(() => {
        const userSet = new Set();
        Object.values(scores).forEach((pub) => {
            Object.values(pub).forEach((crit) => { crit.forEach((score) => { userSet.add(score.userId); }); });
        });
        return userSet;
    }, [scores]);

    const handleSelectPub = useCallback((pub) => {
        setCurrentPub(pub);
        setPage('rate');
    }, [navigate]); 
    
    const handleSelectPubForEdit = useCallback((pub) => {
        setEditingPub(pub);
        setPage('editPub');
    }, [navigate]);

    const handleSavePub = useCallback(async (pubId, name, location, lat, lng, photoURL, googleLink, tags = []) => {
        if (!pubsRef) return;
        try {
            await pubsRef.doc(pubId).update({
                name, location, lat: parseFloat(lat) || null, lng: parseFloat(lng) || null, photoURL: photoURL || "", googleLink: googleLink || "", tags 
            });
            const snapshot = await pubsRef.get();
            setPubs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setEditingPub(null);
            setPage('pubs');
        } catch (e) {
            console.error("Error updating pub", e);
            alert("Failed to update pub");
        }
    }, [pubsRef, navigate]);

    const handleSaveScores = useCallback(() => {
        setCurrentPub(null); 
        setPage('pubs');
    }, [navigate]);

    const handlePromotePub = useCallback(async (pubId) => {
        try {
            await pubsRef.doc(pubId).update({ status: 'visited' });
            const snapshot = await pubsRef.get();
            setPubs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        } 
        catch (e) { console.error("Error promoting pub:", e); }
    }, [pubsRef]);

    const handleSwitchGroup = useCallback(async () => {
        try { await db.collection('users').doc(user.uid).update({ activeGroupId: null }); } 
        catch (e) { console.error("Error switching group:", e); }
    }, [db, user.uid]);

    if (dataLoading || !currentGroup) return <LoadingScreen text={`Loading group ${currentGroup?.name}...`} />;

    return (
        <div className="w-full" style={{ '--theme-color': currentGroup.brandColor || '#2563eb' }}>
            {userProfile?.hasCompletedOnboarding === false && (
                <OnboardingModal user={user} db={db} />
            )}
            <Header user={user} page={page} setPage={setPage} canManageGroup={canManageGroup} groupName={currentGroup?.groupName || 'My Pub Group'} onSwitchGroup={handleSwitchGroup} auth={auth} db={db} userProfile={userProfile} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} scores={scores} pubs={pubs} criteria={activeCriteria} groupId={groupId} />

            <Suspense fallback={<LoadingScreen text="Loading page..." />}>
                <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage user={user} pubs={visitedPubs} newPubs={newPubs} criteria={activeCriteria} users={activeRaters} scores={scores} rankedPubs={rankedVisitedPubs} setPage={setPage} groupId={groupId} db={db} allUsers={allUsers} />} />
                    <Route path="/pubs" element={<PubsPage pubs={rankedVisitedPubs} criteria={activeCriteria} scores={scores} onSelectPub={handleSelectPub} onSelectPubForEdit={handleSelectPubForEdit} canManageGroup={canManageGroup} pubsRef={pubsRef} allUsers={allUsers} currentUser={user} currentGroup={currentGroup} groupRef={groupRef} featureFlags={featureFlags} db={db} />} />
                    <Route path="/toVisit" element={<PubsToVisitPage pubs={newPubs} canManageGroup={canManageGroup} onPromotePub={handlePromotePub} onSelectPubForEdit={handleSelectPubForEdit} allUsers={allUsers} pubsRef={pubsRef} currentGroup={currentGroup} currentUser={user} featureFlags={featureFlags} />} />
                    <Route path="/rate" element={<RateView pub={currentPub} criteria={activeCriteria} user={user} groupId={groupId} groupRef={groupRef} onBack={() => { setCurrentPub(null); setPage('pubs'); }} onSave={handleSaveScores} db={db} scores={scores} />} />
                    <Route path="/editPub" element={<EditPubView pub={editingPub} onSave={handleSavePub} onBack={() => { setEditingPub(null); setPage('pubs'); }} />} />
                    <Route path="/rankings" element={<IndividualRankingsPage pubs={visitedPubs} criteria={activeCriteria} scores={scores} allUsers={allUsers} groupId={groupId} db={db} />} />
                    <Route path="/leaderboard" element={<LeaderboardPage pubs={visitedPubs} criteria={activeCriteria} scores={scores} allUsers={allUsers} groupId={groupId} db={db} currentUser={user} groupRef={groupRef} featureFlags={featureFlags} />} />
                    <Route path="/spin" element={<SpinTheWheelPage pubs={newPubs} />} />
                    <Route path="/admin" element={<AdminPage user={user} groupRef={groupRef} groupId={groupId} db={db} currentGroup={currentGroup} featureFlags={featureFlags} />} />
                    <Route path="/superadmin" element={<SuperAdminPage user={user} db={db} userProfile={userProfile} />} />
                    <Route path="/feedback" element={<FeedbackPage user={user} db={db} groupId={groupId} />} />
                    <Route path="/events" element={<EventsPage user={user} db={db} groupId={groupId} groupRef={groupRef} allUsers={allUsers} canManageGroup={canManageGroup} featureFlags={featureFlags} />} />
                    <Route path="/taproom" element={<TaproomPage user={user} db={db} groupId={groupId} groupRef={groupRef} allUsers={allUsers} pubs={visitedPubs} scores={scores} criteria={activeCriteria} featureFlags={featureFlags} />} />
                    <Route path="/insights" element={<InsightsPage pubs={visitedPubs} scores={scores} criteria={activeCriteria} allUsers={allUsers} groupId={groupId} db={db} />} />
                    <Route path="/venue" element={<VenuePortalPage user={user} db={db} userProfile={userProfile} />} />
                    <Route path="/map" element={<MapPage pubs={[...visitedPubs, ...newPubs]} />} />
                </Routes>
            </Suspense>
        </div>
    );
}
