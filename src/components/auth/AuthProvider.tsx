
"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next-international/client'; 
import { useCurrentLocale } from '@/lib/i18n/client';
import type { ReactNode} from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { UserProfile} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useRouter();
  const pathname = usePathname(); // next/navigation for raw path
  const currentLocale = useCurrentLocale();
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
            // Create new user profile
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
          
          const unlocalizedPathname = pathname.replace(`/${currentLocale}`, '') || '/';
          if (unlocalizedPathname === '/login' || unlocalizedPathname === '/') {
            router.replace('/dashboard');
          }
        } else {
          setUser(null);
          setUserProfile(null);
          
          const unlocalizedPathname = pathname.replace(`/${currentLocale}`, '') || '/';
          if (unlocalizedPathname !== '/login' && !pathname.startsWith('/_next/') && unlocalizedPathname !== '/') {
             router.replace('/login');
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, toast, pathname, currentLocale]);

  const signInWithGoogle = async () => {
    if (isSigningIn) {
      console.log('Sign-in already in progress...');
      return;
    }
    
    setIsSigningIn(true);
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('Successfully signed in:', result.user.email);
      toast({
        title: 'Welcome!',
        description: 'Successfully signed in with Google.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error signing in with Google:', error);
      const firebaseError = error as FirebaseError;
      
      switch (firebaseError.code) {
        case 'auth/popup-closed-by-user':
          console.log('User closed the sign-in popup');
          toast({
            title: 'Sign-in Canceled',
            description: 'The sign-in popup was closed or the process was interrupted. Please try again.',
            variant: 'default',
          });
          break;
        case 'auth/cancelled-popup-request':
          console.log('Popup request was cancelled');
          toast({
            title: 'Sign-in Interrupted',
            description: 'Multiple sign-in attempts detected. Please try again.',
            variant: 'default',
          });
          break;
        case 'auth/popup-blocked':
          toast({
            title: 'Popup Blocked',
            description: 'Please allow popups for this site and try again.',
            variant: 'destructive',
          });
          break;
        case 'auth/operation-not-allowed':
          toast({
            title: 'Sign-in Method Disabled',
            description: 'Google sign-in is currently not available.',
            variant: 'destructive',
          });
          break;
        case 'auth/account-exists-with-different-credential':
          toast({
            title: 'Account Exists',
            description: 'An account already exists with this email using a different sign-in method.',
            variant: 'destructive',
          });
          break;
        case 'auth/network-request-failed':
          toast({
            title: 'Network Error',
            description: 'Please check your internet connection and try again.',
            variant: 'destructive',
          });
          break;
        default:
          toast({
            title: 'Sign In Failed',
            description: firebaseError.message || 'An unexpected error occurred during sign-in. Please try again.',
            variant: 'destructive',
          });
          break;
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    if (loading) return; // Prevent sign out if initial loading is not complete
    
    setLoading(true); // Indicate sign-out process is starting
    
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      router.replace('/login'); // Redirect to login page after sign out
      toast({ 
        title: 'Signed Out', 
        description: "You have been successfully signed out.",
        variant: 'default',
      });
    } catch (error) {
      console.error('Error signing out:', error);
      const firebaseError = error as FirebaseError;
      toast({
        title: 'Sign Out Failed',
        description: firebaseError.message || 'Could not sign you out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false); // Reset loading state after sign-out attempt
    }
  };
  
  const unlocalizedPathname = pathname.replace(`/${currentLocale}`, '') || '/';
  if (loading && !isSigningIn && !unlocalizedPathname.startsWith('/login') && unlocalizedPathname !== '/') {
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
        signOut 
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
