import React, { useState, useMemo, Suspense } from 'react';
import NavigationShell from './components/navigation/NavigationShell';
import useGroupData from './hooks/useGroupData';
import useScoreCalculations from './hooks/useScoreCalculations';
import LoadingScreen from './components/LoadingScreen';
import CheckInButton from './components/CheckInButton';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useUI } from './context/UIContext';
import { useAuth } from './context/AuthContext';
import { useGroup } from './context/GroupContext';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const Dashboard         = React.lazy(() => import('./pages/DashboardPage.jsx'));
const PubDirectoryPage  = React.lazy(() => import('./pages/PubsPage.jsx'));
const RateView          = React.lazy(() => import('./pages/RateView.jsx'));
const EventsPage        = React.lazy(() => import('./pages/EventsPage.jsx'));
const MapPage           = React.lazy(() => import('./pages/MapPage.jsx'));
const LeaderboardPage   = React.lazy(() => import('./pages/LeaderboardPage.jsx'));
const SpinPage          = React.lazy(() => import('./pages/SpinTheWheelPage.jsx'));
const CrawlPage         = React.lazy(() => import('./pages/CrawlPage.jsx'));
const FeedbackPage      = React.lazy(() => import('./pages/FeedbackPage.jsx'));
const VenuePortalPage   = React.lazy(() => import('./pages/VenuePortalPage.jsx'));
const ActivityPage      = React.lazy(() => import('./pages/ActivityPage.jsx'));
const AdminPageLoader      = React.lazy(() => import('./pages/AdminPage.jsx'));
const SuperAdminPageLoader = React.lazy(() => import('./pages/SuperAdminPage.jsx'));
const NotFoundPage         = React.lazy(() => import('./pages/NotFoundPage.jsx'));

// ── Route guard ─────────────────────────────────────────────────────────────
function ProtectedRoute({ allowed, children, fallback = null }) {
    if (!allowed) return fallback;
    return children;
}

function RedirectToDashboard({ setPage }) {
    React.useEffect(() => { setPage('dashboard'); }, [setPage]);
    return null;
}

export default function MainApp({ db, auth }) {
    const { user, userProfile, isStaff, featureFlags } = useAuth();
    const { groupId, groupRef, groupData, canManageGroup } = useGroup();
    const { page, setPage } = useUI();

    const [selectedPub, setSelectedPub] = useState(null);
    const [selectedPubForDetail, setSelectedPubForDetail] = useState(null);

    const { 
        pubs, 
        criteria, 
        rawScores, 
        users,
        isShowingSampleFallback,
        seedRealData,
        isSeeding
    } = useGroupData({ db, groupId });
    const scores = useScoreCalculations(rawScores);

    const allUsers = useMemo(() => {
        if (!Array.isArray(users)) return {};
        return users.reduce((acc, u) => {
            if (u.uid) acc[u.uid] = u;
            return acc;
        }, {});
    }, [users]);

    const sharedProps = {
        pubs, criteria, scores,
        users,
        allUsers,
        user, userProfile,
        groupRef, groupId, db, featureFlags: featureFlags || {}, canManageGroup, isStaff,
        isShowingSampleFallback, seedRealData, isSeeding,
    };

    const renderPage = () => {
        switch (page) {
            case 'pubs':         return <PubDirectoryPage {...sharedProps} onSelectPub={setSelectedPub} onViewDetail={setSelectedPubForDetail} currentUser={user} />;
            case 'events':       return <EventsPage {...sharedProps} />;
            case 'map':          return <MapPage {...sharedProps} onViewDetail={setSelectedPubForDetail} />;
            case 'leaderboard':  return <LeaderboardPage {...sharedProps} onViewDetail={setSelectedPubForDetail} />;
            case 'spin':         return <SpinPage {...sharedProps} onSelectPub={setSelectedPub} />;
            case 'feedback':     return <FeedbackPage {...sharedProps} />;
            case 'venues':
            case 'business':     return <VenuePortalPage db={db} user={user} userProfile={userProfile} />;
            case 'activity':
            case 'taproom':      return <ActivityPage db={db} groupId={groupId} pubs={pubs} allUsers={allUsers} user={user} {...sharedProps} />;
            case 'crawl':        return <CrawlPage {...sharedProps} onViewDetail={setSelectedPubForDetail} />;
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
            <Suspense fallback={<LoadingScreen text="Loading pub rating..." />}>
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
        <NavigationShell pubs={pubs} onSelectPub={setSelectedPub}>
            <ErrorBoundary key={page}>
                <Suspense fallback={<LoadingScreen text="Loading..." />}>
                    {renderPage()}
                </Suspense>
            </ErrorBoundary>
            <CheckInButton user={user} pubs={pubs} groupId={groupId} db={db} />
        </NavigationShell>
    );
}
