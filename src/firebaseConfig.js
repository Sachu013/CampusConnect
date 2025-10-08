import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// --- Your web app's Firebase configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyAxg1tTlJNwXp9kM2Q10BQrLG2-e2ErEmU",
  authDomain: "campusconnect-aad93.firebaseapp.com",
  projectId: "campusconnect-aad93",
  // --- THIS IS THE FINAL CORRECTED LINE ---
  storageBucket: "campusconnect-aad93.firebasestorage.app", 
  messagingSenderId: "72405979424",
  appId: "1:72405979424:web:b98a44a73a420fe6178745",
  databaseURL: "https://campusconnect-aad93-default-rtdb.firebaseio.com/"
};

// --- Initialize Firebase and export the instances ---
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);