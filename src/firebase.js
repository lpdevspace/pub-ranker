import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/functions';

// Firebase project configuration with environment variable support & fallback defaults
const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCyeK-DIBUNaJKUA0m6ghQZX1I6MgIP8eQ",
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pubs-4e9ad.firebaseapp.com",
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID || "pubs-4e9ad",
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pubs-4e9ad.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "343915596044",
    appId:             import.meta.env.VITE_FIREBASE_APP_ID || "1:343915596044:web:02a9b2efc3ff301bf5a129",
    measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-X8DV1HFPJP",
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth    = firebase.auth();
const db      = firebase.firestore();

// Enable Firestore offline persistence for robust offline PWA operation
db.enablePersistence()
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore persistence failed-precondition: multiple tabs open');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore persistence unimplemented: browser not supported');
        }
    });

const storage = firebase.storage();

export { firebase, auth, db, storage };
