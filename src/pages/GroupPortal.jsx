import { useState, useEffect } from 'react';
import { firebase } from '../firebase';
import LoadingScreen from '../components/LoadingScreen';

export default function GroupPortal({ user, userProfile, auth, db }) {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(null); // groupId being entered
    const [view, setView] = useState('list');
    const [newGroupName, setNewGroupName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!user || !db) return;
        const unsubscribe = db.collection('groups')
            .where('members', 'array-contains', user.uid)
            .onSnapshot(snap => {
                setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
        return () => unsubscribe();
    }, [user, db]);

    // Enter a group — sets activeGroupId on the user doc which triggers App.jsx to load MainApp
    const handleSelectGroup = async (groupId) => {
        if (selecting) return;
        setSelecting(groupId);
        setError('');
        try {
            await db.collection('users').doc(user.uid).update({
                activeGroupId: groupId,
                groups: firebase.firestore.FieldValue.arrayUnion(groupId),
            });
            // App.jsx will react to the userProfile snapshot and render MainApp automatically
        } catch (err) {
            console.error('Failed to select group:', err);
            setError('Could not enter group. Please try again.');
            setSelecting(null);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;
        setSubmitting(true); setError('');
        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const ref = await db.collection('groups').add({
                name: newGroupName.trim(),
                code,
                members: [user.uid],
                admins: [user.uid],
                ownerUid: user.uid,
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            // Auto-enter the newly created group
            await handleSelectGroup(ref.id);
            setNewGroupName('');
            setView('list');
        } catch (err) {
            setError('Failed to create group.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setSubmitting(true); setError('');
        try {
            const snap = await db.collection('groups').where('code', '==', joinCode.trim().toUpperCase()).get();
            if (snap.empty) { setError('No group found with that code.'); setSubmitting(false); return; }
            const groupDoc = snap.docs[0];
            if (groupDoc.data().members?.includes(user.uid)) {
                setError('You are already in this group.');
                setSubmitting(false); return;
            }
            await groupDoc.ref.update({ members: firebase.firestore.FieldValue.arrayUnion(user.uid) });
            // Auto-enter the joined group
            await handleSelectGroup(groupDoc.id);
            setJoinCode('');
            setView('list');
        } catch (err) {
            setError('Failed to join group.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="max-w-2xl mx-auto animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--color-text)', fontWeight: 900, lineHeight: 1.1 }}>
                        Your Groups
                    </h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>
                        Manage your pub crawl groups
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                        onClick={() => setView('join')}
                        className="btn-ghost"
                        style={{ fontSize: 'var(--text-sm)' }}
                    >
                        Join
                    </button>
                    <button
                        onClick={() => setView('create')}
                        className="btn-brand"
                        style={{ fontSize: 'var(--text-sm)' }}
                    >
                        + Create
                    </button>
                </div>
            </div>

            {/* Feedback banners */}
            {success && (
                <div style={{
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    color: 'var(--color-success)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-xl)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                }}>
                    checkmark {success}
                </div>
            )}
            {error && (
                <div style={{
                    background: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    color: 'var(--color-error)',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-xl)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                }}>
                    {error}
                </div>
            )}

            {/* Create Group form */}
            {view === 'create' && (
                <div className="card-warm" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--color-text)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                        Create New Group
                    </h3>
                    <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <input
                            value={newGroupName}
                            onChange={e => setNewGroupName(e.target.value)}
                            placeholder="Group name e.g. Wolves Pub Crawl"
                            style={{
                                width: '100%',
                                padding: 'var(--space-3) var(--space-4)',
                                border: '1.5px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--color-surface-2)',
                                color: 'var(--color-text)',
                                fontSize: 'var(--text-base)',
                                outline: 'none',
                                transition: 'border-color var(--transition)',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="btn-ghost"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-brand"
                                style={{ flex: 1, opacity: submitting ? 0.55 : 1 }}
                            >
                                {submitting ? 'Creating...' : 'Create Group'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Join Group form */}
            {view === 'join' && (
                <div className="card-warm" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--color-text)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>
                        Join a Group
                    </h3>
                    <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <input
                            value={joinCode}
                            onChange={e => setJoinCode(e.target.value)}
                            placeholder="Enter invite code e.g. AB12CD"
                            style={{
                                width: '100%',
                                padding: 'var(--space-3) var(--space-4)',
                                border: '1.5px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--color-surface-2)',
                                color: 'var(--color-text)',
                                fontSize: 'var(--text-base)',
                                outline: 'none',
                                textTransform: 'uppercase',
                                letterSpacing: '0.15em',
                                fontWeight: 700,
                                fontFamily: 'var(--font-body)',
                                transition: 'border-color var(--transition)',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--color-brand)'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-border)'}
                        />
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button
                                type="button"
                                onClick={() => setView('list')}
                                className="btn-ghost"
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-brand"
                                style={{ flex: 1, opacity: submitting ? 0.55 : 1 }}
                            >
                                {submitting ? 'Joining...' : 'Join Group'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Groups list / empty state */}
            {groups.length === 0 ? (
                <div className="card-warm" style={{ padding: 'var(--space-12) var(--space-8)', textAlign: 'center' }}>
                    <span style={{ fontSize: '3.5rem', display: 'block', marginBottom: 'var(--space-4)' }}>🍻</span>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', color: 'var(--color-text)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                        No groups yet
                    </h3>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', maxWidth: '34ch', margin: '0 auto var(--space-6)' }}>
                        Create or join a group to start ranking pubs together.
                    </p>
                    <button onClick={() => setView('create')} className="btn-brand btn-brand-lg">
                        Create Your First Group
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {groups.map(group => (
                        <button
                            key={group.id}
                            onClick={() => handleSelectGroup(group.id)}
                            disabled={!!selecting}
                            className="card-warm"
                            style={{
                                padding: 'var(--space-5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 'var(--space-4)',
                                width: '100%',
                                textAlign: 'left',
                                cursor: selecting === group.id ? 'wait' : 'pointer',
                                opacity: selecting && selecting !== group.id ? 0.5 : 1,
                                transition: 'opacity 0.2s, transform 0.15s',
                                border: 'none',
                                background: 'none',
                            }}
                        >
                            <div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-text)', fontWeight: 700, marginBottom: 'var(--space-1)' }}>
                                    {group.name}
                                </h3>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                    {group.members?.length || 1} member{(group.members?.length || 1) !== 1 ? 's' : ''}{' '}·{' '}
                                    Code:{' '}
                                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-brand)', letterSpacing: '0.08em' }}>
                                        {group.code}
                                    </span>
                                </p>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                                {selecting === group.id ? (
                                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 600 }}>Entering...</span>
                                ) : (
                                    <>
                                        <span style={{ fontSize: '1.75rem' }}>🍺</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} aria-hidden="true">
                                            <path d="M9 18l6-6-6-6" />
                                        </svg>
                                    </>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
