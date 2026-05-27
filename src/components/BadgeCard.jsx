import React from 'react';
import { TIER_STYLES } from '../utils/badgeEngine';

/**
 * BadgeCard — displays a single badge in earned or locked state.
 * Props:
 *   badge        — badge definition + { earned, progress, currentValue }
 *   size         — 'sm' | 'md' (default 'md')
 *   showProgress — show progress bar when not earned (default true)
 */
export default function BadgeCard({ badge, size = 'md', showProgress = true }) {
    const tier   = TIER_STYLES[badge.tier] || TIER_STYLES.bronze;
    const earned = badge.earned;
    const isSmall = size === 'sm';

    const container = {
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        padding:        isSmall ? '0.6rem 0.5rem' : '1rem 0.75rem',
        borderRadius:   '1rem',
        border:         `2px solid ${earned ? tier.ring : 'transparent'}`,
        background:     earned ? tier.bg : 'var(--color-surface-2, #f3f4f6)',
        opacity:        earned ? 1 : 0.55,
        filter:         earned ? 'none' : 'grayscale(0.6)',
        transition:     'transform 200ms ease, box-shadow 200ms ease, opacity 200ms ease',
        cursor:         'default',
        position:       'relative',
        minWidth:       isSmall ? '4.5rem' : '6rem',
        textAlign:      'center',
        boxShadow:      earned ? `0 2px 12px ${tier.ring}33` : 'none',
    };

    return (
        <div style={container} title={badge.description}>
            {/* Tier indicator */}
            {earned && (
                <span style={{
                    position:   'absolute',
                    top:        '0.3rem',
                    right:      '0.35rem',
                    fontSize:   '0.6rem',
                    lineHeight: 1,
                    opacity:    0.8,
                }}>
                    {tier.star}
                </span>
            )}

            {/* Emoji */}
            <span style={{ fontSize: isSmall ? '1.6rem' : '2rem', lineHeight: 1, marginBottom: '0.4rem' }}>
                {earned ? badge.emoji : '🔒'}
            </span>

            {/* Name */}
            <span style={{
                fontSize:       isSmall ? '0.6rem' : '0.65rem',
                fontWeight:     800,
                textTransform:  'uppercase',
                letterSpacing:  '0.05em',
                color:          earned ? tier.ring : 'var(--color-text-muted, #6b7280)',
                lineHeight:     1.2,
                marginBottom:   '0.2rem',
                maxWidth:       isSmall ? '4rem' : '5.5rem',
                overflow:       'hidden',
                display:        '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
            }}>
                {badge.name}
            </span>

            {/* Tier label */}
            {!isSmall && (
                <span style={{
                    fontSize:      '0.55rem',
                    fontWeight:    700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color:         earned ? tier.ring : 'var(--color-text-faint, #9ca3af)',
                    opacity:       earned ? 0.8 : 0.6,
                    marginBottom:  showProgress && !earned ? '0.4rem' : 0,
                }}>
                    {tier.label}
                </span>
            )}

            {/* Progress bar (locked badges only) */}
            {showProgress && !earned && badge.progress > 0 && (
                <div style={{ width: '100%', marginTop: '0.4rem' }}>
                    <div style={{
                        width:        '100%',
                        height:       '4px',
                        background:   'var(--color-surface-dynamic, #e5e7eb)',
                        borderRadius: '9999px',
                        overflow:     'hidden',
                    }}>
                        <div style={{
                            height:           '100%',
                            width:            `${badge.progress}%`,
                            background:       tier.ring,
                            borderRadius:     '9999px',
                            transition:       'width 0.6s cubic-bezier(0.16,1,0.3,1)',
                            opacity:          0.7,
                        }} />
                    </div>
                    {badge.target && (
                        <span style={{
                            fontSize:      '0.5rem',
                            color:         'var(--color-text-muted, #6b7280)',
                            fontWeight:    700,
                            display:       'block',
                            marginTop:     '0.15rem',
                            fontVariantNumeric: 'tabular-nums',
                        }}>
                            {Math.round(badge.currentValue ?? 0)} / {badge.target}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
