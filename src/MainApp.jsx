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

// ── URL <-> page key mapping ────────────────────────────────────────────────
const PATH_TO_PAGE = {
    '/':             'dashboard',
    '/dashboard':    'dashboard',
    '/taproom':      'taproom',
    '/pubs':         'pubs',
    '/hitlist':      'toVisit',
    '/insights':     'insights',
    '/events':       'events',
    '/map':          'map',
    '/leaderboard':  'leaderboard',
    '/versus':       'individual',
    '/spin':         'spin',
    '/feedback':     'feedback',
    '/venues':       'business',
    '/admin':        'admin',
    '/superadmin':   'superadmin',
};

const PAGE_TO_PATH = Object.fromEntries(
    Object.entries(PATH_TO_PAGE).filter(([path]) => path !== '/').map(([path, page]) => [page, path])
);
PAGE_TO_PATH['dashboard'] = '/dashboard';

function getPageFromURL() {
    const path = window.location.pathname;
    return PATH_TO_PAGE[path] || 'dashboard';
}

// ── Route guard ─────────────────────────────────────────────────────────────
function ProtectedRoute({ allowed, children, fallback = null }) {
    if (!allowed) return fallback;
    return children;
}

function RedirectToDashboard({ setPage }) {
    useEffect(() => { setPage('dashboard'); }, [setPage]);
    return null;
}

// Lazy-loaded admin pages — bundles not sent to non-admin users
const AdminPageLoader = React.lazy(() => import('./pages/AdminPage.jsx'));
const SuperAdminPageLoader = React.lazy(() => import('./pages/SuperAdminPage.jsx'));

export default function MainApp({ user, userProfile, groupId, auth, db, isDarkMode, toggleDarkMode, featureFlags = {} }) {
    const [page, setPageState] = useState(getPageFromURL);
    const [selectedPub, setSelectedPub] = useState(null);
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);

    const { groupRef, groupData, pubs, criteria, rawScores, users } = useGroupData({ db, groupId });
    const scores = useScoreCalculations(rawScores);

    const canManageGroup = groupData &&
        (groupData.ownerUid === user.uid || groupData.managers?.includes(user.uid));

    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;

    // Navigate: update state + push to browser history
    const setPage = (newPage) => {
        const path = PAGE_TO_PATH[newPage] || '/dashboard';
        if (window.location.pathname !== path) {
            window.history.pushState({ page: newPage }, '', path);
        }
        setPageState(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Handle browser back/forward buttons
    useEffect(() => {
        const onPop = (e) => {
            const p = e.state?.page || getPageFromURL();
            setPageState(p);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    // On first mount, replace state so the initial entry has page metadata
    useEffect(() => {
        const p = getPageFromURL();
        window.history.replaceState({ page: p }, '', PAGE_TO_PATH[p] || '/dashboard');
    }, []);

    const handleSwitchGroup = async () => {
        try { await db.collection('users').doc(user.uid).update({ activeGroupId: null }); }
        catch (e) { console.error('Error switching group:', e); }
    };

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
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
                {renderPage()}
            </main>
        </>
    );
}
