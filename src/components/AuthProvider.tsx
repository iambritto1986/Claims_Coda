import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isGuest?: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isGuest: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  loginAsGuest: (customEmail?: string, customName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_STORAGE_KEY = 'claimcoda_guest_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local guest session first
    const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
    if (savedGuest) {
      try {
        const parsed = JSON.parse(savedGuest);
        setUser(parsed);
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    }

    // Subscribe to Firebase Auth
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser?.isAnonymous) {
        // This subscription was already active (from mount) before
        // loginAsGuest() below calls signInAnonymously(), so it fires again
        // for that same sign-in. loginAsGuest() already sets the guest user
        // state itself (with the friendly demo name/email) — if this branch
        // didn't skip, it would immediately overwrite that with isGuest:
        // false and a null email/displayName (anonymous Firebase users have
        // neither), silently un-guesting the session right after it started.
        setLoading(false);
        return;
      }
      if (currentUser) {
        // Create user doc if not exists
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              createdAt: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn('Firestore user doc init notice:', e);
        }

        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          isGuest: false,
        });
      } else {
        if (!localStorage.getItem(GUEST_STORAGE_KEY)) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err: any) {
      // If unauthorized-domain or popup blocked, throw so caller can display modal & offer guest fallback
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err: any) {
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      localStorage.removeItem(GUEST_STORAGE_KEY);
    } catch (err: any) {
      throw err;
    }
  };

  // "Guest" used to mean a uid fabricated locally (`guest-${random}`) with no
  // real Firebase Auth session behind it. That uid never satisfies
  // `request.auth.uid` in firestore.rules (every rule requires
  // `isSignedIn()`), so every read/write for a guest was silently rejected
  // with "Missing or insufficient permissions" and the app fell back to
  // in-memory-only state — meaning demo/guest cases were never actually
  // durable, contradicting the PRD's "durable case history" requirement,
  // and it logged a scary-looking permission error on every load.
  //
  // Fixed to use real Firebase Anonymous Authentication: same one-click,
  // no-signup instant access, but backed by a real `request.auth.uid` that
  // Firestore rules accept, so guest cases actually persist. This requires
  // the "Anonymous" sign-in provider to be enabled in the Firebase console
  // (Authentication → Sign-in method) — if it isn't yet, this falls back to
  // the old local-only behavior so the demo still works, just non-durably,
  // and logs a clear one-line instruction instead of a scary Firestore error.
  const loginAsGuest = async (customEmail: string = 'demo.member@claimcoda.app', customName: string = 'Eleanor Vance') => {
    try {
      const cred = await signInAnonymously(auth);
      const guestUser: AppUser = {
        uid: cred.user.uid,
        email: customEmail,
        displayName: customName,
        isGuest: true,
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
      setUser(guestUser);
    } catch (err) {
      console.warn(
        'Anonymous sign-in unavailable — falling back to a local-only guest session (case data will NOT be saved to Firestore). ' +
        'To fix: Firebase Console → Authentication → Sign-in method → enable "Anonymous". Underlying error:',
        err
      );
      const guestUser: AppUser = {
        uid: `guest-${Math.random().toString(36).substring(2, 9)}`,
        email: customEmail,
        displayName: customName,
        isGuest: true,
      };
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
      setUser(guestUser);
    }
  };

  const logout = async () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGuest: !!user?.isGuest,
        login,
        loginWithEmail,
        signUpWithEmail,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
