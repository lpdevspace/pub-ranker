import React from 'react';
import { Wrench, Megaphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import TopBar from './TopBar';
import MobileNavBar from './MobileNavBar';
import GlobalSearchModal from './GlobalSearchModal';

export default function NavigationShell({ children, pubs = [], onSelectPub = () => {} }) {
    const { isMaintenanceMode, isSuperAdmin, globalAnnouncement } = useAuth();

    return (
        <div className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-200">
            {/* Maintenance Banner */}
            {isMaintenanceMode && (
                <div
                    role="alert"
                    className="bg-[var(--color-maint-bg)] text-[var(--color-maint-text)] py-2 px-4 text-xs font-bold uppercase tracking-wider text-center flex items-center justify-center gap-2 z-50 sticky top-0"
                >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Maintenance Mode is Active {isSuperAdmin ? '(SuperAdmin View)' : ''}</span>
                    <Wrench className="w-3.5 h-3.5" />
                </div>
            )}

            {/* Global Announcement Banner */}
            {globalAnnouncement && (
                <div
                    role="status"
                    className="bg-amber-500 text-amber-950 py-2 px-4 text-xs font-bold text-center flex items-center justify-center gap-2 z-40 sticky top-0"
                >
                    <Megaphone className="w-4 h-4 shrink-0" />
                    <span>{globalAnnouncement}</span>
                </div>
            )}

            {/* Clean Single Sticky Header */}
            <TopBar />

            {/* Main Application Container (Centered Luxury Proportions) */}
            <main className="flex-1 app-container py-6 pb-28 md:pb-14 animate-fadeIn">
                {children}
            </main>

            {/* Mobile Bottom Bar & Drawer */}
            <MobileNavBar />

            {/* Quick Search Modal */}
            <GlobalSearchModal pubs={pubs} onSelectPub={onSelectPub} />
        </div>
    );
}
