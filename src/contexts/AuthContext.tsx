import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import {
  checkIsAdminDocument,
  ensureAdminRecord,
  fetchCustomerProfile,
} from '../services/firestoreService';
import { formatUserFriendlyError } from '../lib/firestoreErrors';
import type { CustomerProfile } from '../types/studio';

const BOOTSTRAP_ADMIN_EMAIL = 'masagitu233@gmail.com';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  checkingRole: boolean;
  customerProfile: CustomerProfile | null;
  authError: string | null;
  signInWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  refreshCustomerProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadUserRolesAndProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setIsAdmin(false);
      setCustomerProfile(null);
      setCheckingRole(false);
      return;
    }

    setCheckingRole(true);
    try {
      const isBootstrapOwner =
        currentUser.emailVerified &&
        currentUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL;

      const hasAdminDoc = await checkIsAdminDocument(currentUser.uid);
      const adminAuthorized = hasAdminDoc || isBootstrapOwner;
      setIsAdmin(adminAuthorized);

      if (isBootstrapOwner && !hasAdminDoc) {
        try {
          await ensureAdminRecord({
            uid: currentUser.uid,
            email: currentUser.email || BOOTSTRAP_ADMIN_EMAIL,
            displayName: currentUser.displayName || 'Admin Utama OSAMA',
          });
        } catch {
          // Non-blocking if already handled
        }
      }

      try {
        const profile = await fetchCustomerProfile(currentUser.uid);
        setCustomerProfile(profile);
      } catch {
        setCustomerProfile(null);
      }
    } finally {
      setCheckingRole(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      void loadUserRolesAndProfile(firebaseUser);
    });
    return () => unsub();
  }, [loadUserRolesAndProfile]);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setAuthError(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      return credential.user;
    } catch (error) {
      const friendly = formatUserFriendlyError(error, 'Gagal masuk dengan akun Google.');
      setAuthError(friendly);
      return null;
    }
  }, []);

  const logout = useCallback(async () => {
    setAuthError(null);
    await signOut(auth);
    setIsAdmin(false);
    setCustomerProfile(null);
  }, []);

  const refreshCustomerProfile = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await fetchCustomerProfile(user.uid);
      setCustomerProfile(profile);
    } catch {
      // keep existing state
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isAdmin,
        checkingRole,
        customerProfile,
        authError,
        signInWithGoogle,
        logout,
        refreshCustomerProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
