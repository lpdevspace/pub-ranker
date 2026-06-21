import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import PublicLandingPage from '../pages/PublicLandingPage';
import LoadingScreen from '../components/LoadingScreen';

// All sub-pages are lazy-loaded so the landing-page bundle stays slim.
const PricingPage         = lazy(() => import('../pages/public/PricingPage'));
const ForPubsPage         = lazy(() => import('../pages/public/ForPubsPage'));
const PrivacyPage         = lazy(() => import('../pages/public/PrivacyPage'));
const TermsPage           = lazy(() => import('../pages/public/TermsPage'));
const CookiesPage         = lazy(() => import('../pages/public/CookiesPage'));
const ContactPage         = lazy(() => import('../pages/public/ContactPage'));
const UpgradeSuccessPage  = lazy(() => import('../pages/public/UpgradeSuccessPage'));

/**
 * PublicSiteRouter — owns all routes shown to signed-out visitors.
 * Signed-in users hitting one of these paths still see them; App.jsx
 * decides whether to render this or MainApp based on auth state +
 * route guards.
 */
export default function PublicSiteRouter({ db, user, userProfile, onLoginClick }) {
    return (
        <Suspense fallback={<LoadingScreen text="Loading…" />}>
            <Routes>
                <Route path="/"                index element={<PublicLandingPage db={db} onLoginClick={onLoginClick} />} />
                <Route path="/explore"         element={<PublicLandingPage db={db} onLoginClick={onLoginClick} initialScrollTo="explore-section" />} />
                <Route path="/pricing"         element={<PricingPage onLoginClick={onLoginClick} user={user} userProfile={userProfile} />} />
                <Route path="/for-pubs"        element={<ForPubsPage onLoginClick={onLoginClick} />} />
                <Route path="/privacy"         element={<PrivacyPage onLoginClick={onLoginClick} />} />
                <Route path="/terms"           element={<TermsPage onLoginClick={onLoginClick} />} />
                <Route path="/cookies"         element={<CookiesPage onLoginClick={onLoginClick} />} />
                <Route path="/contact"         element={<ContactPage onLoginClick={onLoginClick} db={db} user={user} />} />
                <Route path="/upgrade/success" element={<UpgradeSuccessPage onLoginClick={onLoginClick} />} />
                {/* Anything else falls back to the landing page */}
                <Route path="*"                element={<PublicLandingPage db={db} onLoginClick={onLoginClick} />} />
            </Routes>
        </Suspense>
    );
}
