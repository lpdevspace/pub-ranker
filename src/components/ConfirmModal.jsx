import React, { useState } from 'react';

/**
 * ConfirmModal — replaces window.confirm() for destructive actions.
 *
 * Props:
 *   title        {string}   — Modal heading
 *   message      {string}   — Body text
 *   confirmLabel {string}   — Label for confirm button (default: 'Confirm')
 *   danger       {bool}     — Red confirm button when true
 *   requireTyped {string}   — Forces user to type this exact string to enable confirm (e.g. 'DELETE')
 *   onConfirm    {function} — Called when user confirms
 *   onClose      {function} — Called when user cancels or presses Escape
 *
 * Usage:
 *   const [confirmState, setConfirmState] = useState(null);
 *
 *   setConfirmState({
 *     title: 'Delete Pub',
 *     message: 'This cannot be undone.',
 *     confirmLabel: 'Delete',
 *     danger: true,
 *     requireTyped: 'DELETE',
 *     onConfirm: () => doTheDelete(),
 *   });
 *
 *   {confirmState && (
 *     <ConfirmModal {...confirmState} onClose={() => setConfirmState(null)} />
 *   )}
 */
export default function ConfirmModal({
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    danger = false,
    requireTyped = null,
    onConfirm,
    onClose,
}) {
    const [typed, setTyped] = useState('');
    const canConfirm = requireTyped ? typed === requireTyped : true;

    const handleConfirm = () => {
        if (!canConfirm) return;
        onClose();
        onConfirm();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'Enter' && canConfirm) handleConfirm();
    };

    const confirmBg = danger ? 'var(--color-error)' : 'var(--color-primary)';
    const confirmBgHover = danger ? 'var(--color-error-hover)' : 'var(--color-primary-hover)';

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            onKeyDown={handleKeyDown}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 'var(--space-4)',
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'var(--color-surface)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-lg)',
                    width: '100%', maxWidth: '26rem',
                    padding: 'var(--space-6)',
                    display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
                    border: '1px solid var(--color-border)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: '1.5rem', lineHeight: 1, marginTop: '0.1em' }}>
                        {danger ? '⚠️' : 'ℹ️'}
                    </span>
                    <div>
                        <h2
                            id="confirm-modal-title"
                            style={{
                                fontSize: 'var(--text-lg)', fontWeight: 900,
                                color: 'var(--color-text)', fontFamily: 'var(--font-display)',
                                marginBottom: 'var(--space-1)',
                            }}
                        >
                            {title}
                        </h2>
                        {message && (
                            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
                                {message}
                            </p>
                        )}
                    </div>
                </div>

                {requireTyped && (
                    <div>
                        <label
                            style={{
                                display: 'block', fontSize: 'var(--text-xs)', fontWeight: 700,
                                color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)',
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}
                        >
                            Type{' '}
                            <strong style={{ color: 'var(--color-error)', fontFamily: 'monospace' }}>
                                {requireTyped}
                            </strong>{' '}
                            to confirm
                        </label>
                        <input
                            autoFocus
                            value={typed}
                            onChange={e => setTyped(e.target.value)}
                            style={{
                                width: '100%', padding: 'var(--space-2) var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                border: `1px solid ${canConfirm && typed ? 'var(--color-error)' : 'var(--color-border)'}`,
                                background: 'var(--color-surface-offset)',
                                color: 'var(--color-text)', fontSize: 'var(--text-sm)',
                                fontFamily: 'monospace', outline: 'none',
                            }}
                            placeholder={requireTyped}
                        />
                    </div>
                )}

                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', paddingTop: 'var(--space-2)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: 'var(--space-2) var(--space-5)',
                            borderRadius: 'var(--radius-lg)',
                            border: '1px solid var(--color-border)',
                            background: 'none',
                            color: 'var(--color-text-muted)',
                            fontWeight: 700, fontSize: 'var(--text-sm)',
                            cursor: 'pointer',
                            transition: 'background var(--transition-interactive)',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-surface-offset)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        style={{
                            padding: 'var(--space-2) var(--space-5)',
                            borderRadius: 'var(--radius-lg)',
                            border: 'none',
                            background: canConfirm ? confirmBg : 'var(--color-surface-dynamic)',
                            color: canConfirm ? '#fff' : 'var(--color-text-faint)',
                            fontWeight: 900, fontSize: 'var(--text-sm)',
                            cursor: canConfirm ? 'pointer' : 'not-allowed',
                            transition: 'background var(--transition-interactive)',
                            opacity: canConfirm ? 1 : 0.6,
                        }}
                        onMouseEnter={e => { if (canConfirm) e.currentTarget.style.background = confirmBgHover; }}
                        onMouseLeave={e => { if (canConfirm) e.currentTarget.style.background = confirmBg; }}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
