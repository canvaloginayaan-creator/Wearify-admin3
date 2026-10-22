// ==========================================================
// AUTH HELPERS — shared by every page that needs sign in/up.
// ==========================================================

import { auth, googleProvider, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export async function signUpCustomer({ name, email, password }) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await setDoc(doc(db, "users", cred.user.uid), {
    name, email, createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function signInCustomer({ email, password }) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

// "Proper" Google sign-in: opens the real Google account picker popup
// and creates a matching profile doc the first time someone signs in.
export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  const ref = doc(db, "users", cred.user.uid);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, {
      name: cred.user.displayName || "",
      email: cred.user.email,
      createdAt: serverTimestamp()
    });
  }
  return cred.user;
}

export function signOutUser() {
  return signOut(auth);
}

export function watchAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function checkIsAdmin(uid) {
  if (!uid) return false;
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

export function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/email-already-in-use": "That email already has an account. Try logging in instead.",
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/user-not-found": "No account found with that email.",
    "auth/wrong-password": "Incorrect password.",
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled."
  };
  return map[code] || "Something went wrong. Please try again.";
}
