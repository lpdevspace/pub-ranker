import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { auth, db, firebase } from './firebase';
import { LoadingScreen } from './App';

import Header from './components/header';
import DashboardPage from './pages/DashboardPage';
import MapPage from './pages/MapPage';
import PubsPage from './pages/PubsPage';
import PubsToVisitPage from './pages/PubsToVisitPage';
import RateView from './pages/RateView';
import EditPubView from './pages/EditPubView';
import IndividualRankingsPage from './pages/IndividualRankingsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import SpinTheWheelPage from './pages/SpinTheWheelPage';
import AdminPage from './pages/AdminPage';
import SuperAdminPage from './pages/SuperAdminPage';
import FeedbackPage from './pages/FeedbackPage';
import EventsPage from './pages/EventsPage'; 

export default function MainApp({ user, userProfile, groupId, auth, db, isDarkMode, toggleDarkMode, featureFlags }) {
    const navigate = useNavigate();
    const location = useLocation();

    // This reads the URL to figure out what page is active (e.g., "/pubs" -> "pubs")
    const page = location.pathname.substring(1) || "dashboard";

    // This replaces your old setPage function so your child components don't break
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
        const unsubscribe = pubsRef.onSnapshot((snapshot) => {
            setPubs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
            setDataLoading(false);
        }, (error) => { console.error("Error fetching pubs:", error); setDataLoading(false); });
        return unsubscribe;
    }, [pubsRef]);

    useEffect(() => {
        const unsubscribe = criteriaRef.onSnapshot((snapshot) => {
            let criteriaData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            criteriaData.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
            setCriteria(criteriaData);
        }, (error) => console.error("Error fetching criteria:", error));
        return unsubscribe;
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

    useEffect(() => {
        if (!db) return;
        const unsubscribe = db.collection('users').onSnapshot((snapshot) => {
            const usersData = {};
            snapshot.docs.forEach((doc) => { usersData[doc.id] = doc.data(); });
            setAllUsers(usersData);
        }, (error) => console.error("Error fetching users:", error));
        return unsubscribe;
    }, [db]);

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

    const handleSelectPub = (pub) => {
        setCurrentPub(pub);
        setPage('rate');
    };
    
    const handleSelectPubForEdit = (pub) => {
        setEditingPub(pub);
        setPage('editPub');
    };

    const handleSavePub = async (pubId, name, location, lat, lng, photoURL, googleLink, tags = []) => {
        if (!pubsRef) return;
        try {
            await pubsRef.doc(pubId).update({
                name,
                location,
                lat: parseFloat(lat) || null,
                lng: parseFloat(lng) || null,
                photoURL: photoURL || "",
                googleLink: googleLink || "",
                tags: tags 
            });
            setEditingPub(null); // Clean up state
            setPage('pubs');
        } catch (e) {
            console.error("Error updating pub", e);
            alert("Failed to update pub");
        }
    };

    const handleSaveScores = () => {
        setCurrentPub(null); // Clean up state
        setPage('pubs');
    };

    const handlePromotePub = async (pubId) => {
        try { await pubsRef.doc(pubId).update({ status: 'visited' }); } 
        catch (e) { console.error("Error promoting pub:", e); }
    };

    const handleSwitchGroup = async () => {
        try { await db.collection('users').doc(user.uid).update({ activeGroupId: null }); } 
        catch (e) { console.error("Error switching group:", e); }
    };

    if (dataLoading || !currentGroup) return <LoadingScreen text={`Loading group ${currentGroup?.name}...`} />;

    return (
        <div className="w-full" style={{ '--theme-color': currentGroup.brandColor || '#2563eb' }}>
            <Header user={user} page={page} setPage={setPage} canManageGroup={canManageGroup} groupName={currentGroup?.groupName || 'My Pub Group'} onSwitchGroup={handleSwitchGroup} auth={auth} db={db} userProfile={userProfile} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} scores={scores} pubs={pubs} criteria={activeCriteria} groupId={groupId} />            
            
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage pubs={visitedPubs} newPubs={newPubs} criteria={activeCriteria} users={activeRaters} scores={scores} rankedPubs={rankedVisitedPubs} setPage={setPage} groupId={groupId} db={db} allUsers={allUsers} />} />
                <Route path="/pubs" element={<PubsPage pubs={rankedVisitedPubs} criteria={activeCriteria} scores={scores} onSelectPub={handleSelectPub} onSelectPubForEdit={handleSelectPubForEdit} canManageGroup={canManageGroup} pubsRef={pubsRef} allUsers={allUsers} currentUser={user} currentGroup={currentGroup} groupRef={groupRef} featureFlags={featureFlags} db={db} />} />
                <Route path="/toVisit" element={<PubsToVisitPage pubs={newPubs} canManageGroup={canManageGroup} onPromotePub={handlePromotePub} onSelectPubForEdit={handleSelectPubForEdit} allUsers={allUsers} pubsRef={pubsRef} currentGroup={currentGroup} currentUser={user} featureFlags={featureFlags} />} />
                <Route path="/rate" element={<RateView pub={currentPub} criteria={activeCriteria} onBack={() => { setCurrentPub(null); setPage('pubs'); }} onSave={handleSaveScores} existingScores={scores[currentPub?.id] || {}} />} />
                <Route path="/editPub" element={<EditPubView pub={editingPub} onBack={() => { setEditingPub(null); setPage('pubs'); }} onSave={handleSavePub} />} />
                <Route path="/map" element={<MapPage pubs={pubs} scores={scores} criteria={activeCriteria} db={db} groupId={groupId} userProfile={userProfile} />} />
                <Route path="/individual" element={<IndividualRankingsPage scores={scores} pubs={pubs} criteria={criteria} allUsers={allUsers} activeRaters={activeRaters} criteriaWeightMap={criteriaWeightMap} />} />
                <Route path="/leaderboard" element={<LeaderboardPage scores={scores} allUsers={allUsers} pubs={pubs} criteria={criteria} db={db} groupId={groupId} />} />
                <Route path="/spin" element={<SpinTheWheelPage pubs={pubs} criteria={activeCriteria} scores={scores} />} />
                <Route path="/events" element={<EventsPage db={db} groupId={groupId} pubs={pubs} user={user} canManageGroup={canManageGroup} allUsers={allUsers} />} />
                <Route path="/feedback" element={<FeedbackPage db={db} userProfile={userProfile} />} />
                <Route path="/admin" element={<AdminPage scores={scores} criteria={criteria} pubs={pubs} user={user} currentGroup={currentGroup} pubsRef={pubsRef} criteriaRef={criteriaRef} groupRef={groupRef} allUsers={allUsers} db={db} featureFlags={featureFlags} />} />
                <Route path="/superadmin" element={<SuperAdminPage db={db} userProfile={userProfile} user={user} />} />
                
                {/* Fallback route */}
                <Route path="*" element={<DashboardPage pubs={visitedPubs} newPubs={newPubs} criteria={activeCriteria} users={activeRaters} scores={scores} rankedPubs={rankedVisitedPubs} setPage={setPage} groupId={groupId} db={db} allUsers={allUsers} />} />
            </Routes>
        </div>
    );
}