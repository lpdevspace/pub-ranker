import React from 'react';

export default function InvitesTab({
    inviteUrl,
    inviteCode,
    requireApproval,
    copyMessage,
    handleCopyInvite,
    setShowQr,
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            <div>
                <h3 style={{ margin: '0 0 var(--space-1)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>Invite Link</h3>
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                    Share this link to invite people to your group.
                    {requireApproval && (
                        <span style={{ marginLeft: 'var(--space-2)', display: 'inline-block', background: 'var(--color-warning-highlight)', color: 'var(--color-warning)', fontSize: 'var(--text-xs)', fontWeight: 700, padding: '2px 10px', borderRadius: 'var(--radius-full)' }}>
                            Approval required
                        </span>
                    )}
                </p>
            </div>

            {/* Invite URL row */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'stretch' }}>
                <input
                    readOnly
                    value={inviteUrl}
                    style={{
                        flex: 1,
                        padding: 'var(--space-2) var(--space-3)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface-offset)',
                        color: 'var(--color-text)',
                        fontSize: 'var(--text-sm)',
                        fontFamily: 'monospace',
                        minWidth: 0,
                    }}
                />
                <button
                    onClick={handleCopyInvite}
                    style={{
                        padding: 'var(--space-2) var(--space-4)',
                        background: copyMessage ? 'var(--color-success)' : 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 600,
                        fontSize: 'var(--text-sm)',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'background var(--transition-interactive)',
                        flexShrink: 0,
                    }}
                >
                    {copyMessage ? '✓ Copied!' : '📋 Copy'}
                </button>
            </div>

            {/* Group ID + QR row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Group ID: <span style={{ fontFamily: 'monospace', color: 'var(--color-text)' }}>{inviteCode}</span>
                </span>
                <button
                    onClick={() => setShowQr(true)}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-1)',
                        padding: 'var(--space-1) var(--space-3)',
                        background: 'var(--color-surface-offset)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-xs)',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        cursor: 'pointer',
                        transition: 'background var(--transition-interactive)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-dynamic)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                >
                    <span style={{ fontSize: '14px' }}>⬛</span> Show QR Code
                </button>
            </div>

            {/* Help text */}
            <div style={{ padding: 'var(--space-4)', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
                    <strong style={{ color: 'var(--color-text)' }}>How it works:</strong> Anyone with this link can request to join your group.
                    {requireApproval
                        ? ' As approval is required, you\'ll need to accept their request from the Members tab.'
                        : ' They\'ll be added automatically — no approval needed.'}
                </p>
            </div>
        </div>
    );
}
