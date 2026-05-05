import React, { useState, useEffect, useRef, useMemo } from 'react';
import Header from './components/header.jsx';
import { firebase } from './firebase';

// Pages
import Dashboard from './pages/Dashboard.jsx';
import PubDirectoryPage from './pages/PubDirectory.jsx';
import RateView from './pages/RateView.jsx';
import ToVisitPage from './pages/ToVisitPage.jsx';
import PubDetailPage from './pages/PubDetailPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import MapPage from './pages/MapPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import IndividualPage from './pages/IndividualPage.jsx';
import SpinPage from './pages/SpinPage.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';
import TaproomPage from './pages/TaproomPage.jsx';
import VenuePortalPage from './pages/VenuePortalPage.jsx';

// ✅ SECURITY FIX: Route guard for admin-only pages
function ProtectedRoute({ allowed, children, fallback = null }) {
    if (!allowed) return fallback;
    return children;
}

export default function MainApp({ user, userProfile, groupId, auth, db, isDarkMode, toggleDarkMode, featureFlags = {} }) {
    const [page, setPage] = useState('dashboard');
    const [groupData, setGroupData] = useState(null);
    const [pubs, setPubs] = useState([]);
    const [criteria, setCriteria] = useState([]);
    const [scores, setScores] = useState({});
    const [users, setUsers] = useState([]);
    const [selectedPub, setSelectedPub] = useState(null);
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);
    const groupRef = useMemo(() => db.collection('groups').doc(groupId), [db, groupId]);

    const canManageGroup = groupData &&
        (groupData.ownerUid === user.uid || groupData.managers?.includes(user.uid));

    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;

    // Listen to group metadata
    useEffect(() => {
        const unsub = groupRef.onSnapshot(doc => {
            if (doc.exists) setGroupData({ id: doc.id, ...doc.data() });
        });
        return () => unsub();
    }, [groupRef]);

    // Listen to pubs
    useEffect(() => {
        const unsub = groupRef.collection('pubs').onSnapshot(snap => {
            setPubs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [groupRef]);

    // Listen to criteria
    useEffect(() => {
        const unsub = groupRef.collection('criteria')
            .where('archived', '==', false)
            .onSnapshot(snap => setCriteria(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        return () => unsub();
    }, [groupRef]);

    // Listen to scores — flat collection, keyed by pubId > criterionId > array
    useEffect(() => {
        const unsub = groupRef.collection('scores').onSnapshot(snap => {
            const scoreMap = {};
            snap.docs.forEach(doc => {
                const d = doc.data();
                if (!scoreMap[d.pubId]) scoreMap[d.pubId] = {};
                if (!scoreMap[d.pubId][d.criterionId]) scoreMap[d.pubId][d.criterionId] = [];
                scoreMap[d.pubId][d.criterionId].push({ ...d, id: doc.id });
            });
            setScores(scoreMap);
        });
        return () => unsub();
    }, [groupRef]);

    // ✅ SECURITY FIX: Only fetch members of the current group, not the entire users collection.
    // This limits data exposure — members can only see other users in their group.
    useEffect(() => {
        if (!groupData?.members?.length) return;
        const memberIds = groupData.members.slice(0, 30); // Firestore 'in' limit is 30
        const unsub = db.collection('users')
            .where(firebase.firestore.FieldPath.documentId(), 'in', memberIds)
            .onSnapshot(snap => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))));
        return () => unsub();
    }, [db, groupData?.members]);

    const handleSwitchGroup = async () => {
        try { await db.collection('users').doc(user.uid).update({ activeGroupId: null }); }
        catch (e) { console.error('Error switching group:', e); }
    };

    // Route: rating view
    if (selectedPub) {
        return (
            <RateView
                pub={selectedPub}
                criteria={criteria}
                user={user}
                onBack={() => setSelectedPub(null)}
                groupRef={groupRef}
                groupId={groupId}
            />
        );
    }

    // Route: pub detail view
    if (selectedPubForDetail) {
        return (
            <PubDetailPage
                pub={selectedPubForDetail}
                scores={scores}
                criteria={criteria}
                users={users}
                user={user}
                groupRef={groupRef}
                groupId={groupId}
                onBack={() => setSelectedPubForDetail(null)}
                onRate={(pub) => { setSelectedPubForDetail(null); setSelectedPub(pub); }}
                canManageGroup={canManageGroup}
            />
        );
    }

    const sharedProps = { pubs, criteria, scores, users, user, userProfile, groupRef, groupId, db, featureFlags, canManageGroup, isStaff };

    const renderPage = () => {
        switch (page) {
            case 'taproom':     return <TaproomPage {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} />;
            case 'pubs':        return <PubDirectoryPage {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} />;
            case 'toVisit':     return <ToVisitPage {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} />;
            case 'insights':    return <InsightsPage {...sharedProps} />;
            case 'events':      return <EventsPage {...sharedProps} />;
            case 'map':         return <MapPage {...sharedProps} onViewDetail={setSelectedPubForDetail} />;
            case 'leaderboard': return <LeaderboardPage {...sharedProps} onViewDetail={setSelectedPubForDetail} />;
            case 'individual':  return <IndividualPage {...sharedProps} />;
            case 'spin':        return <SpinPage {...sharedProps} onSelectPub={setSelectedPub} />;
            case 'feedback':    return <FeedbackPage {...sharedProps} />;
            case 'business':    return <VenuePortalPage db={db} user={user} />;

            // ✅ SECURITY FIX: Admin and SuperAdmin routes now use ProtectedRoute guard.
            // Even if a user navigates to these pages directly, the guard blocks rendering
            // and redirects to dashboard if they don't have the right permissions.
            case 'admin':
                return (
                    <ProtectedRoute allowed={canManageGroup} fallback={<RedirectToDashboard setPage={setPage} />}>
                        {/* Lazy import to avoid exposing AdminPage source to non-admins */}
                        <AdminPageLoader {...sharedProps} groupData={groupData} groupRef={groupRef} auth={auth} />
                    </ProtectedRoute>
                );
            case 'superadmin':
                return (
                    <ProtectedRoute allowed={isStaff} fallback={<RedirectToDashboard setPage={setPage} />}>
                        <SuperAdminPageLoader {...sharedProps} auth={auth} db={db} />
                    </ProtectedRoute>
                );

            case 'dashboard':
            default:
                return <Dashboard {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} setPage={setPage} />;
        }
    };

    return (
        <>
            <Header
                user={user}
                page={page}
                setPage={setPage}
                canManageGroup={canManageGroup}
                groupName={groupData?.groupName || ''}
                onSwitchGroup={handleSwitchGroup}
                auth={auth}
                db={db}
                userProfile={userProfile}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
                scores={scores}
                pubs={pubs}
                criteria={criteria}
                groupId={groupId}
            />
            <main>{renderPage()}</main>
        </>
    );
}

// Redirect component for blocked routes
function RedirectToDashboard({ setPage }) {
    useEffect(() => { setPage('dashboard'); }, [setPage]);
    return null;
}

// Lazy loaders so admin bundles aren't sent to non-admin users
const AdminPageLoader = React.lazy(() => import('./pages/AdminPage.jsx'));
const SuperAdminPageLoader = React.lazy(() => import('./pages/SuperAdminPage.jsx'));
