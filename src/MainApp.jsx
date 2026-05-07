import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/header.jsx';
import useGroupData from './hooks/useGroupData';
import useScoreCalculations from './hooks/useScoreCalculations';

// Pages
import Dashboard from './pages/DashboardPage.jsx';
import PubDirectoryPage from './pages/PubsPage.jsx';
import RateView from './pages/RateView.jsx';
import ToVisitPage from './pages/PubsToVisitPage.jsx';
import InsightsPage from './pages/InsightsPage.jsx';
import EventsPage from './pages/EventsPage.jsx';
import MapPage from './pages/MapPage.jsx';
import LeaderboardPage from './pages/LeaderboardPage.jsx';
import IndividualPage from './pages/IndividualRankingsPage.jsx';
import SpinPage from './pages/SpinTheWheelPage.jsx';
import FeedbackPage from './pages/FeedbackPage.jsx';
import TaproomPage from './pages/TaproomPage.jsx';
import VenuePortalPage from './pages/VenuePortalPage.jsx';

// Route guard
function ProtectedRoute({ allowed, children, fallback = null }) {
    if (!allowed) return fallback;
    return children;
}

// Redirect component used when a protected route is blocked
function RedirectToDashboard({ setPage }) {
    useEffect(() => { setPage('dashboard'); }, [setPage]);
    return null;
}

// Lazy-loaded admin pages — bundles not sent to non-admin users
const AdminPageLoader = React.lazy(() => import('./pages/AdminPage.jsx'));
const SuperAdminPageLoader = React.lazy(() => import('./pages/SuperAdminPage.jsx'));

export default function MainApp({ user, userProfile, groupId, auth, db, isDarkMode, toggleDarkMode, featureFlags = {} }) {
    const [page, setPage] = useState('dashboard');
    const [selectedPub, setSelectedPub] = useState(null);
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);

    // All Firestore listeners centralised in one hook
    // Note: userMembers is now derived internally by useGroupData to avoid circular reference
    const { groupRef, groupData, pubs, criteria, rawScores, users } = useGroupData({ db, groupId });

    // Score map built via memoised aggregation — only recomputes when rawScores changes
    const scores = useScoreCalculations(rawScores);

    const canManageGroup = groupData &&
        (groupData.ownerUid === user.uid || groupData.managers?.includes(user.uid));

    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;

    const handleSwitchGroup = async () => {
        try { await db.collection('users').doc(user.uid).update({ activeGroupId: null }); }
        catch (e) { console.error('Error switching group:', e); }
    };

    // Rating view overrides normal page routing
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

    const sharedProps = {
        pubs, criteria, scores, users, user, userProfile,
        groupRef, groupId, db, featureFlags, canManageGroup, isStaff,
    };

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
            case 'admin':
                return (
                    <ProtectedRoute allowed={canManageGroup} fallback={<RedirectToDashboard setPage={setPage} />}>
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
