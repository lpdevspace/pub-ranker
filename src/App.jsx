import React, { useState, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { auth, db } from './firebase';
import MainApp from './MainApp';
import LoadingScreen from './components/LoadingScreen';
import PublicSiteRouter from './pages/PublicSiteRouter';
import AuthScreen from './pages/AuthScreen';
import GroupPortal from './pages/GroupPortal';
import { ToastProvider } from './context/ToastContext';
import ToastContainer from './components/ToastContainer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GroupProvider, useGroup } from './context/GroupContext';
import { UIProvider } from './context/UIContext';

// Lazy-loaded — only used on the business.pubranker.uk subdomain
const VenuePortalPage = React.lazy(() => import('./pages/VenuePortalPage'));

function AppContent() {
    const location = useLocation();
    const { user, userProfile, authLoading, isMaintenanceMode, isSuperAdmin, isBanned, isVenueOwner, signOut } = useAuth();
    const { groupId } = useGroup();
    const [showAuth, setShowAuth] = useState(false);

    const publicPaths = ['/pricing', '/for-pubs', '/privacy', '/terms', '/cookies', '/contact', '/upgrade/success'];
    const isPublicPath = publicPaths.some(p => location.pathname.startsWith(p));

    const isBusinessDomain = typeof window !== 'undefined' && window.location.hostname.startsWith('business');
    const showVenuePortal = isBusinessDomain && isVenueOwner;

    if (authLoading) {
        return <LoadingScreen text="Loading Pub Ranker..." />;
    }

    if (isPublicPath) {
        return <PublicSiteRouter db={db} user={user} userProfile={userProfile} onLoginClick={() => setShowAuth(true)} />;
    }

    if (!user) {
        return showAuth ? (
            <AuthScreen auth={auth} onBack={() => setShowAuth(false)} />
        ) : (
            <PublicSiteRouter db={db} user={null} userProfile={null} onLoginClick={() => setShowAuth(true)} />
        );
    }

    if (!userProfile) {
        return <LoadingScreen text="Loading user profile..." />;
    }

    if (isMaintenanceMode && !isSuperAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4 text-center">
                <div className="card-tavern p-8 max-w-md w-full border border-[var(--color-border)] shadow-xl">
                    <span className="text-6xl mb-4 block">🚧</span>
                    <h1 className="text-3xl font-display font-normal text-[var(--color-text)] mb-2">Under Maintenance</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                        Pub Ranker is currently undergoing scheduled maintenance. We&apos;ll be back shortly!
                    </p>
                    <button
                        onClick={signOut}
                        className="btn-ghost w-full justify-center"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        );
    }

    if (isBanned) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)] p-4 text-center">
                <div className="card-tavern p-8 max-w-md w-full border border-red-300 dark:border-red-900 shadow-xl">
                    <span className="text-6xl mb-4 block">🛑</span>
                    <h1 className="text-3xl font-display font-normal text-red-600 mb-2">Account Banned</h1>
                    <p className="text-sm text-[var(--color-text-muted)] mb-6">
                        Your account has been suspended. Please contact support if you believe this is a mistake.
                    </p>
                    <button
                        onClick={signOut}
                        className="w-full bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 transition"
                    >
                        Log Out
                    </button>
                </div>
            </div>
        );
    }

    if (showVenuePortal) {
        return (
            <Suspense fallback={<LoadingScreen text="Loading Venue Portal..." />}>
                <div className="min-h-screen bg-[var(--color-bg)] animate-fadeIn">
                    <div className="p-4 flex justify-end">
                        <button
                            onClick={signOut}
                            className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition"
                        >
                            Log Out
                        </button>
                    </div>
                    <VenuePortalPage db={db} user={user} userProfile={userProfile} />
                </div>
            </Suspense>
        );
    }

    if (!groupId || !userProfile.groups?.includes(groupId)) {
        return (
            <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4">
                <GroupPortal user={user} userProfile={userProfile} auth={auth} db={db} />
            </div>
        );
    }

    return <MainApp db={db} auth={auth} />;
}

export default function App() {
    return (
        <ToastProvider>
            <AuthProvider>
                <GroupProvider>
                    <UIProvider>
                        <AppContent />
                        <ToastContainer />
                    </UIProvider>
                </GroupProvider>
            </AuthProvider>
        </ToastProvider>
    );
}
