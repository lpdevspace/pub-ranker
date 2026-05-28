import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Header from './components/header.jsx';
import useGroupData from './hooks/useGroupData';
import useScoreCalculations from './hooks/useScoreCalculations';
import LoadingScreen from './components/LoadingScreen';
import CheckInButton from './components/CheckInButton';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// ── Lazy-loaded pages — each page becomes its own split chunk ──────────────────
const Dashboard         = React.lazy(() => import('./pages/DashboardPage.jsx'));
const PubDirectoryPage  = React.lazy(() => import('./pages/PubsPage.jsx'));
const RateView          = React.lazy(() => import('./pages/RateView.jsx'));
const ToVisitPage       = React.lazy(() => import('./pages/PubsToVisitPage.jsx'));
const InsightsPage      = React.lazy(() => import('./pages/InsightsPage.jsx'));
const EventsPage        = React.lazy(() => import('./pages/EventsPage.jsx'));
const MapPage           = React.lazy(() => import('./pages/MapPage.jsx'));
const LeaderboardPage   = React.lazy(() => import('./pages/LeaderboardPage.jsx'));
const IndividualPage    = React.lazy(() => import('./pages/IndividualRankingsPage.jsx'));
const SpinPage          = React.lazy(() => import('./pages/SpinTheWheelPage.jsx'));
const FeedbackPage      = React.lazy(() => import('./pages/FeedbackPage.jsx'));
const TaproomPage       = React.lazy(() => import('./pages/TaproomPage.jsx'));
const VenuePortalPage   = React.lazy(() => import('./pages/VenuePortalPage.jsx'));
const AchievementsPage  = React.lazy(() => import('./pages/AchievementsPage.jsx'));
const CheckInsPage      = React.lazy(() => import('./pages/CheckInsPage.jsx'));
const AdminPageLoader      = React.lazy(() => import('./pages/AdminPage.jsx'));
const SuperAdminPageLoader = React.lazy(() => import('./pages/SuperAdminPage.jsx'));
const NotFoundPage         = React.lazy(() => import('./pages/NotFoundPage.jsx'));

// ── URL <-> page key mapping ──────────────────────────────────────────────────────────────────
const PATH_TO_PAGE = {
    '/':               'dashboard',
    '/dashboard':      'dashboard',
    '/taproom':        'taproom',
    '/pubs':           'pubs',
    '/hitlist':        'toVisit',
    '/insights':       'insights',
    '/events':         'events',
    '/map':            'map',
    '/leaderboard':    'leaderboard',
    '/versus':         'individual',
    '/spin':           'spin',
    '/feedback':       'feedback',
    '/venues':         'business',
    '/achievements':   'achievements',
    '/checkins':       'checkins',
    '/admin':          'admin',
    '/superadmin':     'superadmin',
};

const PAGE_TO_PATH = Object.fromEntries(
    Object.entries(PATH_TO_PAGE).filter(([path]) => path !== '/').map(([path, page]) => [page, path])
);
PAGE_TO_PATH['dashboard'] = '/dashboard';

function getPageFromURL() {
    const path = window.location.pathname;
    return PATH_TO_PAGE[path] || '404';
}

// ── Route guard ─────────────────────────────────────────────────────────────────────────────
function ProtectedRoute({ allowed, children, fallback = null }) {
    if (!allowed) return fallback;
    return children;
}

function RedirectToDashboard({ setPage }) {
    useEffect(() => { setPage('dashboard'); }, [setPage]);
    return null;
}

export default function MainApp({ user, userProfile, groupId, auth, db, isDarkMode, toggleDarkMode, featureFlags = {} }) {
    const [page, setPageState] = useState(getPageFromURL);
    const [selectedPub, setSelectedPub] = useState(null);
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);

    const { groupRef, groupData, pubs, criteria, rawScores, users } = useGroupData({ db, groupId });
    const scores = useScoreCalculations(rawScores);

    const allUsers = useMemo(() => {
        if (!Array.isArray(users)) return {};
        return users.reduce((acc, u) => {
            if (u.uid) acc[u.uid] = u;
            return acc;
        }, {});
    }, [users]);

    const canManageGroup = groupData &&
        (groupData.ownerUid === user.uid || groupData.managers?.includes(user.uid));

    const isStaff = userProfile?.isSuperAdmin || userProfile?.isAdmin || userProfile?.isModerator;

    const setPage = (newPage) => {
        const path = PAGE_TO_PATH[newPage] || '/dashboard';
        if (window.location.pathname !== path) {
            window.history.pushState({ page: newPage }, '', path);
        }
        setPageState(newPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const onPop = (e) => {
            const p = e.state?.page || getPageFromURL();
            setPageState(p);
        };
        window.addEventListener('popstate', onPop);
        return () => window.removeEventListener('popstate', onPop);
    }, []);

    useEffect(() => {
        const p = getPageFromURL();
        window.history.replaceState({ page: p }, '', PAGE_TO_PATH[p] || window.location.pathname);
    }, []);

    const handleSwitchGroup = async () => {
        try { await db.collection('users').doc(user.uid).update({ activeGroupId: null }); }
        catch (e) { console.error('Error switching group:', e); }
    };

    const sharedProps = {
        pubs, criteria, scores,
        users,
        allUsers,
        user, userProfile,
        groupRef, groupId, db, featureFlags, canManageGroup, isStaff,
    };

    const renderPage = () => {
        switch (page) {
            case 'taproom':      return <TaproomPage {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} />;
            case 'pubs':         return <PubDirectoryPage {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} currentUser={user} />;
            case 'toVisit':      return <ToVisitPage {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} />;
            case 'insights':     return <InsightsPage {...sharedProps} />;
            case 'events':       return <EventsPage {...sharedProps} />;
            case 'map':          return <MapPage {...sharedProps} onViewDetail={setSelectedPubForDetail} />;
            case 'leaderboard':  return <LeaderboardPage {...sharedProps} onViewDetail={setSelectedPubForDetail} />;
            case 'individual':   return <IndividualPage {...sharedProps} />;
            case 'spin':         return <SpinPage {...sharedProps} onSelectPub={setSelectedPub} />;
            case 'feedback':     return <FeedbackPage {...sharedProps} />;
            case 'business':     return <VenuePortalPage db={db} user={user} />;
            case 'achievements': return <AchievementsPage {...sharedProps} />;
            case 'checkins':     return <CheckInsPage db={db} groupId={groupId} pubs={pubs} allUsers={allUsers} user={user} />;
            case 'admin':
                return (
                    <ProtectedRoute allowed={canManageGroup} fallback={<RedirectToDashboard setPage={setPage} />}>
                        <AdminPageLoader {...sharedProps} currentGroup={groupData} groupRef={groupRef} auth={auth} />
                    </ProtectedRoute>
                );
            case 'superadmin':
                return (
                    <ProtectedRoute allowed={isStaff} fallback={<RedirectToDashboard setPage={setPage} />}>
                        <SuperAdminPageLoader {...sharedProps} auth={auth} db={db} />
                    </ProtectedRoute>
                );
            case '404':
                return <NotFoundPage setPage={setPage} />;
            case 'dashboard':
            default:
                return <Dashboard {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} setPage={setPage} />;
        }
    };

    if (selectedPub) {
        return (
            <Suspense fallback={<LoadingScreen text="Loading..." />}>
                <RateView
                    pub={selectedPub}
                    criteria={criteria}
                    user={user}
                    onBack={() => setSelectedPub(null)}
                    groupRef={groupRef}
                    groupId={groupId}
                />
            </Suspense>
        );
    }

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
            <main className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6">
                {/* Per-page ErrorBoundary so one broken page can't take down the whole app */}
                <ErrorBoundary key={page}>
                    <Suspense fallback={<LoadingScreen text="Loading..." />}>
                        {renderPage()}
                    </Suspense>
                </ErrorBoundary>
            </main>
            <CheckInButton user={user} pubs={pubs} groupId={groupId} db={db} />
        </>
    );
}
