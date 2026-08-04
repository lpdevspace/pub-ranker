import React from 'react';

export default function ActivityPage({ db, groupId, pubs, allUsers, user }) {
    return (
        <div className="space-y-8 animate-fadeIn pb-24">
            <div className="mb-8">
                <h2 className="font-display text-3xl md:text-4xl font-bold mb-1 text-text">Group Activity</h2>
                <p className="font-body text-sm font-semibold text-muted">Recent check-ins and unlocked badges from your group.</p>
            </div>

            <div className="card-premium p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="text-5xl mb-4 opacity-50">🍻</div>
                <h3 className="font-display text-xl font-bold text-text mb-2">Unified Activity Feed</h3>
                <p className="font-body text-sm text-muted max-w-sm mx-auto">
                    We are currently redesigning the activity feed to combine check-ins and achievements into a single, clean timeline. Check back soon!
                </p>
            </div>
        </div>
    );
}
