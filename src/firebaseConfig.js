import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from "firebase/storage"; // --- NEW: Import getStorage ---

// --- Your web app's Firebase configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAxg1tTlJNwXp9kM2Q10BQrLG2-e2ErEmU",
  authDomain: "campusconnect-aad93.firebaseapp.com",
  projectId: "campusconnect-aad93",
  storageBucket: "campusconnect-aad93.firebasestorage.app",
  messagingSenderId: "72405979424",
  appId: "1:72405979424:web:b98a44a73a420fe6178745"
};

// --- Initialize Firebase and export the instances ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // --- NEW: Initialize Storage ---

export { auth, db, storage };
