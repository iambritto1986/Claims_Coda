import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
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
  loginAsGuest: (customEmail?: string, customName?: string) => void;
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

  const loginAsGuest = (customEmail: string = 'demo.member@claimcoda.app', customName: string = 'Eleanor Vance') => {
    const guestUser: AppUser = {
      uid: `guest-${Math.random().toString(36).substring(2, 9)}`,
      email: customEmail,
      displayName: customName,
      isGuest: true,
    };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
    setUser(guestUser);
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
