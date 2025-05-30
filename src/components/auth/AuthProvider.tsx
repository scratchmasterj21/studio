
"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation'; // Changed back to next/navigation
import type { ReactNode} from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { UserProfile} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface AuthProviderProps {
  children: ReactNode;
  // locale prop removed
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  // currentLocale removed
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            const newUserProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: 'user',
              createdAt: serverTimestamp() as Timestamp,
            };

            try {
              await setDoc(userRef, newUserProfile);
              setUserProfile(newUserProfile);
            } catch (error) {
              console.error('Error creating user profile in Firestore:', error);
              toast({
                title: 'Profile Creation Failed',
                description: 'Could not save your user profile. Please try again.',
                variant: 'destructive',
              });
            }
          }

          const isOnLoginOrRootPath = pathname === '/login' || pathname === '/';
          if (isOnLoginOrRootPath) {
             router.replace('/dashboard');
          }
        } else {
          setUser(null);
          setUserProfile(null);
          const isOnPublicPath = pathname === '/login' || pathname === '/';
          const isNextInternalPath = pathname.startsWith('/_next/');

          if (!isOnPublicPath && !isNextInternalPath) {
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Auth state change error:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, toast, pathname]);

  const signInWithGoogle = async () => {
    if (isSigningIn) {
      console.log('[AuthProvider] Sign-in already in progress...');
      return;
    }
    setIsSigningIn(true);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AuthProvider] Successfully signed in:', result.user.email);
      toast({
        title: 'Welcome!',
        description: 'Successfully signed in with Google.',
        variant: 'default',
      });
      // Redirect is handled by useEffect
    } catch (error) {
      console.error('[AuthProvider] Error signing in with Google:', error);
      const firebaseError = error as FirebaseError;

      let title = 'Sign In Failed';
      let description = firebaseError.message || 'An unexpected error occurred during sign-in. Please try again.';

      switch (firebaseError.code) {
        case 'auth/popup-closed-by-user':
        case 'auth/cancelled-popup-request':
          title = 'Sign-in Canceled';
          description = 'The sign-in popup was closed or the process was interrupted. Please try again.';
          break;
        case 'auth/popup-blocked':
          title = 'Popup Blocked';
          description = 'Please allow popups for this site and try again.';
          break;
        case 'auth/operation-not-allowed':
          title = 'Sign-in Method Disabled';
          description = 'Google sign-in is currently not available.';
          break;
        case 'auth/account-exists-with-different-credential':
          title = 'Account Exists';
          description = 'An account already exists with this email using a different sign-in method.';
          break;
        case 'auth/network-request-failed':
          title = 'Network Error';
          description = 'Please check your internet connection and try again.';
          break;
      }
      toast({ title, description, variant: 'destructive' });
    } finally {
      setIsSigningIn(false);
      setLoading(false); // Ensure loading state is reset
    }
  };

  const signOut = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      router.replace('/login');
      toast({
        title: 'Signed Out',
        description: "You have been successfully signed out.",
        variant: 'default',
      });
    } catch (error) {
      console.error('[AuthProvider] Error signing out:', error);
      const firebaseError = error as FirebaseError;
      toast({
        title: 'Sign Out Failed',
        description: firebaseError.message || 'Could not sign you out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const isOnPublicPathCheck = pathname === '/login' || pathname === '/';
  if (loading && !isOnPublicPathCheck) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading: loading || isSigningIn,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
