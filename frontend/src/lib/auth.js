import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await upsertUserDoc(cred.user);
  return cred.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export async function upsertUserDoc(user) {
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  await setDoc(
    ref,
    {
      email: user.email ?? null,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      lastSeenAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export function initialsFor(user) {
  const name = user?.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || 'U';
  }
  return user?.email?.[0]?.toUpperCase() ?? 'U';
}
