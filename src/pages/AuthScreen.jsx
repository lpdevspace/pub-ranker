import { useState } from 'react';
import { firebase } from '../firebase';
import { getFriendlyError } from '../constants/authErrors';

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full relative">
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-white transition font-bold"
                >
                    ← Back
                </button>
                <h2 className="text-3xl font-black mb-8 text-center text-gray-800 dark:text-white mt-6">
                    Welcome to Pub Ranker
                </h2>

                {/* Social sign-in buttons */}
                <div className="space-y-4 mb-6">
                    <button
                        onClick={handleGoogleSignIn}
                        className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                        Sign in with Google
                    </button>
                    <button
                        onClick={handleAppleSignIn}
                        className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-900 transition flex items-center justify-center gap-2 shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.43.987 3.96.948 1.567-.04 2.613-1.5 3.616-2.978 1.155-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.55 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.56-1.702z" />
                        </svg>
                        Sign in with Apple
                    </button>
                    <button
                        onClick={handleFacebookSignIn}
                        className="w-full bg-[#1877F2] text-white py-3 rounded-xl font-bold hover:bg-[#166FE5] transition flex items-center justify-center gap-2 shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        Sign in with Facebook
                    </button>
                </div>

                <div className="relative flex items-center py-2 mb-6">
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold tracking-wider">Or continue with email</span>
                    <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
                </div>

                <div className="space-y-3">
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full px-4 py-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full px-4 py-3 border dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {isSignUp && (
                            <p className="text-xs text-gray-400 mt-1 ml-1">Must be at least 8 characters</p>
                        )}
                    </div>
                    <button
                        onClick={handleAuthAction}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-lg hover:bg-blue-700 transition shadow-md"
                    >
                        {isSignUp ? 'Sign Up' : 'Log In'}
                    </button>
                </div>

                {error && (
                    <p className="text-red-500 text-sm mt-4 text-center font-bold bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                        {error}
                    </p>
                )}

                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                    <button
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                        className="text-blue-600 dark:text-blue-400 hover:underline ml-1 font-bold"
                    >
                        {isSignUp ? 'Log In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    );
}
