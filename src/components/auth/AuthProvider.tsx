
"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { usePathname, useRouter as useNextRouter } from 'next/navigation'; // Use Next.js router
import { useCurrentLocale } from '@/lib/i18n/client'; // For getting current locale
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
  const router = useNextRouter(); // Using Next.js router for base path redirects
  const pathname = usePathname(); // next/navigation for raw path
  const currentLocale = useCurrentLocale();
  console.log('[AuthProvider] currentLocale from useCurrentLocale():', currentLocale); // ADDED FOR DEBUGGING
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
          
          // Redirect only if on login/register pages (unprefixed paths)
          // The middleware will handle locale prefixing if necessary.
          if (pathname === `/${currentLocale}/login` || pathname === '/login' || pathname === `/${currentLocale}/` || pathname === '/') {
            router.replace('/dashboard');
          }
        } else {
          setUser(null);
          setUserProfile(null);
          
          // Only redirect to login if not already on public pages and not internal Next.js paths
          const publicPaths = ['/login', '/', `/${currentLocale}/login`, `/${currentLocale}/`];
          // Check if currentLocale is valid before using in path construction
          const isValidLocaleForPath = currentLocale && currentLocale !== 'undefined';
          const localePrefixedLogin = isValidLocaleForPath ? `/${currentLocale}/login` : '/login';
          const localePrefixedRoot = isValidLocaleForPath ? `/${currentLocale}/` : '/';
          
          const currentPublicPaths = ['/login', '/', localePrefixedLogin, localePrefixedRoot].filter(Boolean);


          if (!currentPublicPaths.includes(pathname) && !pathname.startsWith('/_next/')) {
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
  }, [router, toast, pathname, currentLocale]); // currentLocale added as dependency

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
        case 'auth/cancelled-popup-request':
          toast({
            title: 'Sign-in Canceled',
            description: 'The sign-in popup was closed or the process was interrupted. Please try again.',
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
    if (loading) return; 
    
    setLoading(true);
    
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      // The middleware should handle locale prefixing for /login if necessary
      router.replace('/login'); 
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
      setLoading(false);
    }
  };
  
  // Check if we are on any public path (could be prefixed or unprefixed)
  // Ensure currentLocale is valid before using in path construction
  const isValidLocaleForPath = currentLocale && currentLocale !== 'undefined';
  const localePrefixedLogin = isValidLocaleForPath ? `/${currentLocale}/login` : '/login';
  const localePrefixedRoot = isValidLocaleForPath ? `/${currentLocale}/` : '/';
  const publicPathsToCheck = ['/login', '/', localePrefixedLogin, localePrefixedRoot].filter(Boolean);
  const isOnPublicPath = publicPathsToCheck.includes(pathname);


  if (loading && !isOnPublicPath) {
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

    