
"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app'; // Import FirebaseError for type checking
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';
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
  const [loading, setLoading] = useState(true); // Overall auth state loading
  const [isSigningIn, setIsSigningIn] = useState(false); // Specific to signInWithGoogle action
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
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
            photoURL: firebaseUser.photoURL, // Corrected line
            role: 'user', // Default role
            createdAt: serverTimestamp() as Timestamp, // Ensure this is correctly typed if not serverTimestamp
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
            // Potentially sign out user if profile creation is critical
            // await firebaseSignOut(auth); 
            // setUser(null);
            // setUserProfile(null);
          }
        }
        // Redirect only if on login/register pages
        if (pathname === '/login' || pathname === '/') {
          router.replace('/dashboard');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        // Only redirect to login if not already on public pages like /login
        if (pathname !== '/login' && !pathname.startsWith('/_next/')) { // Added check for _next internal paths
         // router.replace('/login'); // Commented out to prevent redirect loops during initial load or if already on login
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, toast, pathname]);

  const signInWithGoogle = async () => {
    if (isSigningIn) return; // Prevent multiple sign-in attempts
    setIsSigningIn(true);
    // setLoading(true); // Handled by onAuthStateChanged
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting user, userProfile, and navigation
      // No need to call router.replace here directly as onAuthStateChanged handles it
      // setLoading(false) is handled by onAuthStateChanged
    } catch (error) {
      console.error('Error signing in with Google: ', error);
      const firebaseError = error as FirebaseError;
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        toast({
          title: 'Sign-in Canceled',
          description: 'The sign-in process was interrupted. Please try again if you wish to sign in.',
          variant: 'default',
        });
      } else if (firebaseError.code === 'auth/cancelled-popup-request') {
         toast({
          title: 'Sign-in Interrupted',
          description: 'Multiple sign-in windows were opened. Please try again.',
          variant: 'default',
        });
      }
      else {
        toast({
          title: 'Sign In Failed',
          description: firebaseError.message || 'An unexpected error occurred during sign-in.',
          variant: 'destructive',
        });
      }
      // setLoading(false); // Ensure loading state is reset
    } finally {
      setIsSigningIn(false); // Reset sign-in attempt flag
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      router.replace('/login');
      toast({ title: 'Signed Out', description: "You have been successfully signed out." });
    } catch (error) {
      console.error('Error signing out: ', error);
      const firebaseError = error as FirebaseError;
      toast({
        title: 'Sign Out Failed',
        description: firebaseError.message || 'Could not sign you out. Please try again.',
        variant: 'destructive',
      });
      setLoading(false); // Reset loading only if error, success is handled by onAuthStateChanged
    }
  };
  
  // This prevents rendering children until initial auth check is complete,
  // unless on a public path like /login.
  if (loading && !pathname.startsWith('/login') && pathname !== '/') {
     return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }


  return (
    <AuthContext.Provider value={{ user, userProfile, loading: loading || isSigningIn, signInWithGoogle, signOut }}>
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
