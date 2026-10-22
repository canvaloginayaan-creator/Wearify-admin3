// ==========================================================
// FIREBASE CONFIG
// ----------------------------------------------------------
// Replace the values below with YOUR OWN Firebase project's
// config object. Get this from:
// Firebase Console -> Project Settings -> General ->
// "Your apps" -> Web app -> SDK setup and configuration
//
// See README.md ("Step 2: Get your Firebase config") for the
// full walkthrough.
// ==========================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBYvOW-THW_kDm_RX1_ScgWfm2ltO5BxfA",
  authDomain: "mens-clothing-store-9e980.firebaseapp.com",
  projectId: "mens-clothing-store-9e980",
  storageBucket: "mens-clothing-store-9e980.firebasestorage.app",
  messagingSenderId: "685309055758",
  appId: "1:685309055758:web:9df4045d5b108f64a03d5f",
  measurementId: "G-G8PP7WR3S2"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
