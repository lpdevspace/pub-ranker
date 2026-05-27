/**
 * BadgeToast.jsx
 *
 * Phase 2 — in-app badge unlock notification toast.
 *
 * Renders a stack of animated toast cards in the bottom-right corner.
 * Each toast auto-dismisses after 5 seconds and can be manually closed.
 *
 * Props:
 *   queue         Array<{ _id, displayName, badgeName, badgeEmoji, userId }>
 *   setQueue      State setter to remove dismissed toasts
 *   currentUserId string — used to personalise the message ("You" vs name)
 */

import React, { useEffect } from 'react';
import { TIER_STYLES } from '../utils/badgeEngine';

// Badge id → tier lookup (mirrors BADGE_DEFINITIONS but avoids importing the full engine)
const BADGE_TIER = {
    first_pint: 'bronze', local_regular: 'bronze', pub_hopper: 'silver',
    seasoned_crawler: 'silver', century_club: 'gold', legend_of_the_local: 'legendary',
    generous_soul: 'bronze', tough_love: 'bronze', the_perfectionist: 'bronze',
    the_harsh_truth: 'bronze', consistent_critic: 'silver', review_royalty: 'silver',
    first_addition: 'bronze', directory_builder: 'silver', top_of_the_pops: 'gold',
    trendsetter: 'silver', crawl_organiser: 'bronze', hitlister: 'bronze',
    all_rounder: 'silver', dedicated_drinker: 'silver', platinum_palate: 'legendary',
};

const AUTO_DISMISS_MS = 5000;

function Toast({ item, onDismiss, currentUserId }) {
    const tier = BADGE_TIER[item.badgeId] || 'bronze';
    const style = TIER_STYLES[tier] || TIER_STYLES.bronze;
    const isMe  = item.userId === currentUserId;
    const who   = isMe ? 'You' : (item.displayName || 'Someone');

    useEffect(() => {
        const t = setTimeout(onDismiss, AUTO_DISMISS_MS);
        return () => clearTimeout(t);
    }, [onDismiss]);

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '0.75rem',
                background:    'var(--color-surface, #fff)',
                border:        `2px solid ${style.ring}55`,
                borderRadius:  '1rem',
                padding:       '0.7rem 1rem 0.7rem 0.8rem',
                boxShadow:     '0 8px 32px rgba(0,0,0,0.14)',
                minWidth:      260,
                maxWidth:      320,
                animation:     'badgeToastIn 0.35s cubic-bezier(0.16,1,0.3,1) both',
                position:      'relative',
                overflow:      'hidden',
            }}
        >
            {/* shimmer bar */}
            <div style={{
                position:   'absolute',
                bottom:     0,
                left:       0,
                height:     3,
                width:      '100%',
                background: `linear-gradient(90deg, ${style.ring}00, ${style.ring}, ${style.ring}00)`,
                animation:  `badgeToastBar ${AUTO_DISMISS_MS}ms linear forwards`,
            }} />

            <span style={{
                fontSize:      '2rem',
                lineHeight:    1,
                flexShrink:    0,
                filter:        `drop-shadow(0 0 6px ${style.ring}88)`,
            }}>
                {item.badgeEmoji}
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                    margin:      0,
                    fontSize:    '0.75rem',
                    fontWeight:  900,
                    color:       style.ring,
                    lineHeight:  1.2,
                    whiteSpace:  'nowrap',
                    overflow:    'hidden',
                    textOverflow:'ellipsis',
                }}>
                    {item.badgeName}
                    <span style={{
                        marginLeft: '0.4rem',
                        fontSize:   '0.6rem',
                        fontWeight: 700,
                        background: style.bg,
                        color:      style.ring,
                        borderRadius: '9999px',
                        padding:    '0.1rem 0.4rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        {tier}
                    </span>
                </p>
                <p style={{
                    margin:     '0.15rem 0 0',
                    fontSize:   '0.72rem',
                    color:      'var(--color-text-muted)',
                    lineHeight: 1.3,
                }}>
                    {isMe ? '🎉 You just unlocked a new badge!' : `🎉 ${who} just earned a badge!`}
                </p>
            </div>

            <button
                onClick={onDismiss}
                aria-label="Dismiss"
                style={{
                    flexShrink:  0,
                    color:       'var(--color-text-faint)',
                    fontSize:    '1rem',
                    lineHeight:  1,
                    padding:     '0.25rem',
                    borderRadius:'0.25rem',
                    transition:  'color 180ms ease',
                }}
            >
                ×
            </button>

            <style>{`
                @keyframes badgeToastIn {
                    from { opacity: 0; transform: translateY(16px) scale(0.96); }
                    to   { opacity: 1; transform: translateY(0)     scale(1);    }
                }
                @keyframes badgeToastBar {
                    from { transform: scaleX(1); transform-origin: left; }
                    to   { transform: scaleX(0); transform-origin: left; }
                }
            `}</style>
        </div>
    );
}

export default function BadgeToast({ queue = [], setQueue, currentUserId }) {
    if (!queue.length) return null;

    function dismiss(id) {
        setQueue(q => q.filter(t => t._id !== id));
    }

    return (
        <div
            aria-label="Badge unlock notifications"
            style={{
                position:      'fixed',
                bottom:        'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)',
                right:         '1.25rem',
                zIndex:        9999,
                display:       'flex',
                flexDirection: 'column',
                gap:           '0.6rem',
                alignItems:    'flex-end',
                pointerEvents: 'none',
            }}
        >
            {queue.slice(0, 4).map(item => (
                <div key={item._id} style={{ pointerEvents: 'all' }}>
                    <Toast
                        item={item}
                        currentUserId={currentUserId}
                        onDismiss={() => dismiss(item._id)}
                    />
                </div>
            ))}
        </div>
    );
}
