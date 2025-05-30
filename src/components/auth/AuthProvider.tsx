
"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { UserProfile} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useLocale } from '@/contexts/LocaleContext'; // Import useLocale

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // Renamed to avoid conflict
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { locale, loadingLocale } = useLocale(); // Get locale and its loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
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
            await setDoc(userRef, newUserProfile);
            setUserProfile(newUserProfile);
          }
          // Redirect logic remains simple; actual locale prefixing is handled by links/navigation
          if (pathname === '/login' || pathname === '/') {
             router.replace('/dashboard');
          }
        } else {
          setUser(null);
          setUserProfile(null);
          const isOnPublicPath = pathname === '/login' || pathname === '/';
          // For locale-prefixed paths, this check needs to be smarter or rely on root layout behavior
          // For simplicity, if not on /login or /, redirect to /login.
          // Actual path validation should ideally happen at the page/layout level that requires auth.
          if (!isOnPublicPath && !pathname.startsWith('/_next/')) { 
            router.replace('/login');
          }
        }
      } catch (error) {
        console.error('[AuthProvider] Auth state change error:', error);
        setUser(null);
        setUserProfile(null);
         toast({
            title: 'Authentication Error',
            description: 'Could not process your authentication state. Please try refreshing.',
            variant: 'destructive',
          });
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, toast, pathname]); // locale removed from deps as redirects are to base paths

  const signInWithGoogle = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast({
        title: 'Welcome!',
        description: 'Successfully signed in with Google.',
      });
      // Redirect is handled by useEffect
    } catch (error) {
      const firebaseError = error as FirebaseError;
      let title = 'Sign In Failed';
      let description = firebaseError.message || 'An unexpected error occurred during sign-in. Please try again.';
      if (firebaseError.code === 'auth/popup-closed-by-user' || firebaseError.code === 'auth/cancelled-popup-request') {
        title = 'Sign-in Canceled';
        description = 'The sign-in popup was closed or the process was interrupted. Please try again.';
      } else if (firebaseError.code === 'auth/popup-blocked') {
        title = 'Popup Blocked';
        description = 'Please allow popups for this site and try again.';
      }
      console.error('[AuthProvider] Error signing in with Google:', firebaseError);
      toast({ title, description, variant: 'destructive' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    if (authLoading || isSigningIn) return;
    setAuthLoading(true); // Indicate sign-out process
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      router.replace('/login');
      toast({
        title: 'Signed Out',
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      console.error('[AuthProvider] Error signing out:', error);
      toast({
        title: 'Sign Out Failed',
        description: (error as FirebaseError).message || 'Could not sign you out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setAuthLoading(false);
    }
  };

  const overallLoading = authLoading || loadingLocale || isSigningIn;

  // Avoid rendering children if essential context (like locale) is still loading,
  // or if auth state is loading and user is not on a public path.
  const isOnPublicPathCheck = pathname === '/login' || pathname === '/';
  if (overallLoading && !isOnPublicPathCheck) {
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
        loading: overallLoading,
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
