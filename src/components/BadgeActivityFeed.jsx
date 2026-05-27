/**
 * BadgeActivityFeed.jsx
 *
 * Phase 2 — "Group Activity" strip shown at the top of AchievementsPage.
 *
 * Reads the last N recentUnlocks docs from Firestore (already fetched via
 * useBadgeUnlocks) and renders a compact horizontal scrolling ticker of
 * recent badge unlocks across the whole group.
 *
 * Props:
 *   db          Firestore instance
 *   groupId     string
 *   currentUserId string
 *   users       Array<{ uid, displayName, ... }>
 */

import React, { useState, useEffect } from 'react';
import { TIER_STYLES } from '../utils/badgeEngine';
import { getUserDisplayName } from '../utils/users';

const TIER_LOOKUP = {
    first_pint: 'bronze', local_regular: 'bronze', pub_hopper: 'silver',
    seasoned_crawler: 'silver', century_club: 'gold', legend_of_the_local: 'legendary',
    generous_soul: 'bronze', tough_love: 'bronze', the_perfectionist: 'bronze',
    the_harsh_truth: 'bronze', consistent_critic: 'silver', review_royalty: 'silver',
    first_addition: 'bronze', directory_builder: 'silver', top_of_the_pops: 'gold',
    trendsetter: 'silver', crawl_organiser: 'bronze', hitlister: 'bronze',
    all_rounder: 'silver', dedicated_drinker: 'silver', platinum_palate: 'legendary',
};

function timeAgo(ts) {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

export default function BadgeActivityFeed({ db, groupId, currentUserId, users = [] }) {
    const [activity, setActivity] = useState([]);

    useEffect(() => {
        if (!db || !groupId) return;
        const unsub = db
            .collection('groups').doc(groupId)
            .collection('recentUnlocks')
            .orderBy('unlockedAt', 'desc')
            .limit(15)
            .onSnapshot(
                snap => {
                    const items = [];
                    snap.forEach(doc => items.push({ _id: doc.id, ...doc.data() }));
                    setActivity(items);
                },
                err => console.warn('BadgeActivityFeed:', err)
            );
        return unsub;
    }, [db, groupId]);

    if (!activity.length) return null;

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <p style={{
                fontSize:      '0.65rem',
                fontWeight:    700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color:         'var(--color-text-muted)',
                marginBottom:  '0.5rem',
            }}>
                🕐 Group Activity
            </p>

            <div style={{
                display:         'flex',
                gap:             '0.6rem',
                overflowX:       'auto',
                paddingBottom:   '0.25rem',
                scrollbarWidth:  'none',
                msOverflowStyle: 'none',
            }}>
                {activity.map(item => {
                    const tier  = TIER_LOOKUP[item.badgeId] || 'bronze';
                    const style = TIER_STYLES[tier] || TIER_STYLES.bronze;
                    const isMe  = item.userId === currentUserId;

                    // Try to get display name from users prop (richer than Firestore stored name)
                    const member     = (Array.isArray(users) ? users : []).find(u => u.uid === item.userId);
                    const memberName = member ? getUserDisplayName(member) : (item.displayName || 'Someone');
                    const firstName  = isMe ? 'You' : memberName.split(' ')[0];

                    return (
                        <div
                            key={item._id}
                            title={`${memberName} earned ${item.badgeName}`}
                            style={{
                                flexShrink:    0,
                                display:       'flex',
                                alignItems:    'center',
                                gap:           '0.45rem',
                                padding:       '0.4rem 0.75rem 0.4rem 0.5rem',
                                borderRadius:  '9999px',
                                background:    style.bg,
                                border:        `1.5px solid ${style.ring}40`,
                                whiteSpace:    'nowrap',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{item.badgeEmoji}</span>
                            <div>
                                <span style={{
                                    fontSize:   '0.72rem',
                                    fontWeight: 800,
                                    color:      style.ring,
                                }}>
                                    {firstName}
                                </span>
                                <span style={{
                                    fontSize: '0.72rem',
                                    color:    'var(--color-text-muted)',
                                }}>
                                    {' '}{isMe ? 'earned' : 'earned'}{' '}
                                </span>
                                <span style={{
                                    fontSize:   '0.72rem',
                                    fontWeight: 700,
                                    color:      'var(--color-text)',
                                }}>
                                    {item.badgeName}
                                </span>
                                <span style={{
                                    marginLeft: '0.35rem',
                                    fontSize:   '0.62rem',
                                    color:      'var(--color-text-faint)',
                                }}>
                                    · {timeAgo(item.unlockedAt)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
