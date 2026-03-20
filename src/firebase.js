// src/firebase.js
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage'; // Updated to use compat

const firebaseConfig = {
    apiKey: "AIzaSyCyeK-DIBUNaJKUA0m6ghQZX1I6MgIP8eQ",
    authDomain: "pubs-4e9ad.firebaseapp.com",
    projectId: "pubs-4e9ad",
    storageBucket: "pubs-4e9ad.firebasestorage.app",
    messagingSenderId: "343915596044",
    appId: "1:343915596044:web:02a9b2efc3ff301bf5a129",
    measurementId: "G-X8DV1HFPJP"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage(); // Initialize here for consistency

export { auth, db, firebase, storage };