import React from 'react';
import {
    LayoutDashboard,
    BookOpen,
    Navigation,
    Map,
    Menu,
    X,
    Beer,
    Trophy,
    Calendar,
    Shuffle,
    MessageCircle,
    Settings,
    Shield,
    Store,
    LogOut,
    Users
} from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { useGroup } from '../../context/GroupContext';
import { useAuth } from '../../context/AuthContext';

export default function MobileNavBar() {
    const { page, setPage, isMobileDrawerOpen, toggleMobileDrawer, closeMobileDrawer } = useUI();
    const { canManageGroup, switchGroup } = useGroup();
    const { isStaff, isVenueOwner, signOut } = useAuth();

    const primaryItems = [
        { key: 'dashboard', label: 'Home', icon: LayoutDashboard },
        { key: 'pubs',      label: 'Directory', icon: BookOpen },
        { key: 'crawl',     label: 'Crawl', icon: Navigation },
        { key: 'map',       label: 'Map', icon: Map },
    ];

    const secondaryItems = [
        { key: 'activity',    label: 'Live Taproom', icon: Beer },
        { key: 'leaderboard', label: 'Leaderboard & Badges', icon: Trophy },
        { key: 'events',      label: 'Calendar & Events', icon: Calendar },
        { key: 'spin',        label: 'Spin the Wheel', icon: Shuffle },
        { key: 'feedback',    label: 'Send Feedback', icon: MessageCircle },
    ];

    if (canManageGroup) {
        secondaryItems.push({ key: 'admin', label: 'Group Admin', icon: Settings });
    }
    if (isVenueOwner) {
        secondaryItems.push({ key: 'venues', label: 'Venue Portal (B2B)', icon: Store });
    }
    if (isStaff) {
        secondaryItems.push({ key: 'superadmin', label: 'Platform SuperAdmin', icon: Shield });
    }

    return (
        <>
            {/* Slide-up Drawer for Secondary Sections */}
            {isMobileDrawerOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={closeMobileDrawer}
                    />

                    {/* Sheet Panel */}
                    <div className="relative bg-[var(--color-surface)] border-t border-[var(--color-border)] rounded-t-3xl p-6 shadow-2xl z-10 max-h-[80vh] overflow-y-auto animate-fadeIn">
                        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-divider)] mb-4">
                            <span className="font-display text-xl text-[var(--color-text)] font-normal">More Features</span>
                            <button
                                onClick={closeMobileDrawer}
                                className="p-1.5 rounded-full bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {secondaryItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = page === item.key;
                                return (
                                    <button
                                        key={item.key}
                                        onClick={() => {
                                            setPage(item.key);
                                            closeMobileDrawer();
                                        }}
                                        className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs font-semibold transition text-left ${
                                            isActive
                                                ? 'bg-[var(--color-brand-highlight)] border-[var(--color-brand)] text-[var(--color-brand)]'
                                                : 'bg-[var(--color-surface-offset)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-divider)]'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t border-[var(--color-divider)] flex items-center justify-between gap-3">
                            <button
                                onClick={() => {
                                    switchGroup(null);
                                    closeMobileDrawer();
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-[var(--color-border)] text-xs font-semibold text-[var(--color-text)] bg-[var(--color-surface)]"
                            >
                                <Users className="w-4 h-4" />
                                <span>Switch Group</span>
                            </button>
                            <button
                                onClick={() => {
                                    signOut();
                                    closeMobileDrawer();
                                }}
                                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Log Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fixed Bottom Bar on Mobile */}
            <nav
                aria-label="Mobile navigation"
                className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[var(--color-surface)]/95 backdrop-blur-md border-t border-[var(--color-border)] px-2 py-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
            >
                <div className="flex items-center justify-around">
                    {primaryItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = page === item.key && !isMobileDrawerOpen;
                        return (
                            <button
                                key={item.key}
                                onClick={() => {
                                    setPage(item.key);
                                    if (isMobileDrawerOpen) closeMobileDrawer();
                                }}
                                className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                                    isActive
                                        ? 'text-[var(--color-brand)] font-bold'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                                }`}
                            >
                                <Icon className="w-5 h-5 mb-0.5" />
                                <span className="text-[10px] tracking-tight">{item.label}</span>
                            </button>
                        );
                    })}

                    <button
                        onClick={toggleMobileDrawer}
                        className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition ${
                            isMobileDrawerOpen
                                ? 'text-[var(--color-brand)] font-bold'
                                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                        }`}
                        aria-label="More navigation"
                    >
                        <Menu className="w-5 h-5 mb-0.5" />
                        <span className="text-[10px] tracking-tight">More</span>
                    </button>
                </div>
            </nav>
        </>
    );
}
