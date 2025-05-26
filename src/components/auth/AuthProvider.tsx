
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
  const [loading, setLoading] = useState(true);
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
            photoURL: firebaseUser.photoURL,
            role: 'user', // Default role
            createdAt: serverTimestamp() as Timestamp,
          };
          await setDoc(userRef, newUserProfile);
          setUserProfile(newUserProfile);
        }
        if (pathname === '/login') {
          router.push('/dashboard');
        }
      } else {
        setUser(null);
        setUserProfile(null);
        if (pathname !== '/login') {
           router.push('/login');
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, pathname]);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle redirect and profile creation
      toast({ title: "Signed in successfully!" });
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      const firebaseError = error as FirebaseError; // Cast to FirebaseError
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        toast({
          title: "Sign-in Canceled",
          description: "You closed the sign-in window. Please try again if you wish to sign in.",
          variant: "default", 
        });
      } else {
        toast({
          title: "Sign in Failed",
          description: firebaseError.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
      toast({ title: "Signed out successfully." });
      // onAuthStateChanged will handle redirect
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({ title: "Sign out failed", description: (error as Error).message, variant: "destructive" });
      setLoading(false);
    }
  };

  if (loading && (pathname !== '/login' && !user )) {
     // Show a full-page loader if not on login page and still determining auth state
     // or if on a protected route and not yet authenticated
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // If loading is done and user is null, but we are not on the login page,
  // the useEffect's redirect will handle it. This avoids rendering children prematurely.
  // If user is present, or we are on the login page, render children.
  // Or if initial load is complete (loading = false), allow rendering children (login page or dashboard)
  const shouldRenderChildren = !loading || user || pathname === '/login';


  return (
    <AuthContext.Provider value={{ user, userProfile, loading, signInWithGoogle, signOut }}>
      {shouldRenderChildren ? children : (
        <div className="flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
