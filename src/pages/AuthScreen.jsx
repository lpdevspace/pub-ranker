import { useState } from 'react';
import { firebase } from '../firebase';
import { getFriendlyError } from '../constants/authErrors';
import PintGlassLogo from '../components/PintGlassLogo';

export default function AuthScreen({ auth, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [error, setError] = useState('');

    const handleAuthAction = async () => {
        setError('');
        if (isSignUp) {
            if (!email.includes('@')) { setError('Please enter a valid email address.'); return; }
            if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }
        }
        try {
            if (isSignUp) await auth.createUserWithEmailAndPassword(email, password);
            else await auth.signInWithEmailAndPassword(email, password);
        } catch (e) {
            setError(getFriendlyError(e.code));
        }
    };

    const handleGoogleSignIn = async () => {
        setError('');
        try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
        catch (e) { setError(getFriendlyError(e.code)); }
    };

    const handleAppleSignIn = async () => {
        setError('');
        try { await auth.signInWithPopup(new firebase.auth.OAuthProvider('apple.com')); }
        catch (e) { setError(getFriendlyError(e.code)); }
    };

    const handleFacebookSignIn = async () => {
        setError('');
        try { await auth.signInWithPopup(new firebase.auth.FacebookAuthProvider()); }
        catch (e) { setError(getFriendlyError(e.code)); }
    };

    const inputStyle = {
        width: '100%',
        padding: 'var(--space-3) var(--space-4)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--color-surface-2)',
        color: 'var(--color-text)',
        fontSize: 'var(--text-sm)',
        outline: 'none',
        transition: 'border-color var(--transition), box-shadow var(--transition)',
        fontFamily: 'var(--font-body)',
    };

    return (
        <div
            style={{
                minHeight: '100dvh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--color-bg)',
                padding: 'var(--space-4)',
                fontFamily: 'var(--font-body)',
            }}
        >
            <div
                style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-2xl)',
                    boxShadow: 'var(--shadow-lg)',
                    padding: 'var(--space-10) var(--space-8)',
                    maxWidth: '380px',
                    width: '100%',
                    position: 'relative',
                }}
            >
                {/* Back button */}
                <button
                    onClick={onBack}
                    style={{
                        position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
                        fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                        transition: 'color var(--transition)',
                        fontFamily: 'var(--font-body)',
                    }}
                >
                    ← Back
                </button>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)', marginTop: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
                        <PintGlassLogo size={40} showText={false} style={{ color: 'var(--color-brand)' }} />
                    </div>
                    <h1
                        style={{
                            fontFamily: 'var(--font-display)',
                            fontSize: 'var(--text-xl)',
                            fontWeight: 900,
                            color: 'var(--color-text)',
                            marginBottom: 'var(--space-1)',
                        }}
                    >
                        Welcome back
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                        {isSignUp ? 'Create your Pub Ranker account' : 'Sign in to your group'}
                    </p>
                </div>

                {/* Social sign-in buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                    {/* Google — official white button */}
                    <button
                        onClick={handleGoogleSignIn}
                        style={{
                            width: '100%', backgroundColor: '#fff', border: '1px solid #dadce0',
                            color: '#3c4043', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 'var(--space-3)', cursor: 'pointer', fontSize: 'var(--text-sm)',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                            transition: 'background var(--transition), box-shadow var(--transition)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" style={{ width: 20, height: 20 }} alt="" />
                        Continue with Google
                    </button>

                    {/* Apple — always black */}
                    <button
                        onClick={handleAppleSignIn}
                        style={{
                            width: '100%', backgroundColor: '#000', color: '#fff',
                            padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 'var(--space-3)', cursor: 'pointer', fontSize: 'var(--text-sm)',
                            border: '1px solid #000',
                            transition: 'opacity var(--transition)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.43.987 3.96.948 1.567-.04 2.613-1.5 3.616-2.978 1.155-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.55 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
                        </svg>
                        Continue with Apple
                    </button>

                    {/* Facebook — brand blue */}
                    <button
                        onClick={handleFacebookSignIn}
                        style={{
                            width: '100%', backgroundColor: '#1877F2', color: '#fff',
                            padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)',
                            fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 'var(--space-3)', cursor: 'pointer', fontSize: 'var(--text-sm)',
                            border: 'none',
                            transition: 'background var(--transition)',
                            fontFamily: 'var(--font-body)',
                        }}
                    >
                        <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        Continue with Facebook
                    </button>
                </div>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-divider)' }} />
                    <span style={{ color: 'var(--color-text-faint)', fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                        or email
                    </span>
                    <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-divider)' }} />
                </div>

                {/* Email / password fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAuthAction()}
                        placeholder="Email address"
                        style={inputStyle}
                    />
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAuthAction()}
                            placeholder="Password"
                            style={inputStyle}
                        />
                        {isSignUp && (
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-1)', paddingLeft: 'var(--space-1)' }}>
                                Must be at least 8 characters
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleAuthAction}
                        className="btn-brand"
                        style={{ width: '100%', justifyContent: 'center', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', fontSize: 'var(--text-base)', fontWeight: 800 }}
                    >
                        {isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </div>

                {/* Error message */}
                {error && (
                    <div
                        style={{
                            marginTop: 'var(--space-4)',
                            backgroundColor: 'var(--color-error-bg)',
                            border: '1px solid color-mix(in oklch, var(--color-error) 30%, transparent)',
                            borderRadius: 'var(--radius-lg)',
                            padding: 'var(--space-3) var(--space-4)',
                            color: 'var(--color-error)',
                            fontSize: 'var(--text-sm)',
                            fontWeight: 600,
                            textAlign: 'center',
                        }}
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* Toggle sign up / log in */}
                <p
                    style={{
                        textAlign: 'center',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-text-muted)',
                        marginTop: 'var(--space-6)',
                    }}
                >
                    {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--color-brand)', fontWeight: 700,
                            fontSize: 'var(--text-sm)',
                            fontFamily: 'var(--font-body)',
                            textDecoration: 'underline',
                            textUnderlineOffset: '2px',
                        }}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
