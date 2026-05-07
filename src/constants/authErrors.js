// Friendly Firebase auth error messages — single source of truth
export const FIREBASE_AUTH_ERRORS = {
    'auth/email-already-in-use':   'An account with this email already exists.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password is too weak. Please use at least 8 characters.',
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Please try again.',
    'auth/too-many-requests':      'Too many attempts. Please wait a moment and try again.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-closed-by-user':   'Sign-in was cancelled.',
};

export const getFriendlyError = (code) =>
    FIREBASE_AUTH_ERRORS[code] || 'Something went wrong. Please try again.';
