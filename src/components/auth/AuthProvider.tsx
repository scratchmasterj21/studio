
"use client";

import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { usePathname, useRouter as useNextRouter } from 'next/navigation';
import type { ReactNode} from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider } from '@/lib/firebase';
import type { UserProfile} from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { defaultLocale, locales, type Locale } from '@/lib/i18n/settings'; // Import locale settings

interface AuthProviderProps {
  children: ReactNode;
  locale: Locale; // Receive locale as a prop
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  currentLocale: Locale; // Expose currentLocale
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children, locale }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const router = useNextRouter();
  const pathname = usePathname(); // next/navigation for raw path
  
  const currentLocale = locale; // Use the locale passed as a prop
  console.log('[AuthProvider] Initial locale from prop:', currentLocale);
  
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
          
          const loginPath = `/${currentLocale}/login`;
          const rootPath = `/${currentLocale}`;
          const nonPrefixedLoginPath = '/login';
          const nonPrefixedRootPath = '/';

          const isLoginOrRoot = 
            pathname === loginPath || 
            pathname === rootPath || 
            pathname === nonPrefixedLoginPath || 
            pathname === nonPrefixedRootPath ||
            (currentLocale === defaultLocale && (pathname === '/login' || pathname === '/'));


          if (isLoginOrRoot) {
             // For default locale, redirect to /dashboard, for others /<locale>/dashboard
             const dashboardPath = currentLocale === defaultLocale ? '/dashboard' : `/${currentLocale}/dashboard`;
             console.log(`[AuthProvider] User logged in, on login/root. Redirecting to: ${dashboardPath}`);
             router.replace(dashboardPath);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          
          const publicPaths = [
            `/${currentLocale}/login`,
            nonPrefixedLoginPath, // For default locale
            // For default locale root, it can be '/' or '/en' if 'en' is default.
            // Assuming default locale does not have prefix.
          ];
          
          // Check if current pathname, without considering locale prefix for default, is a public path
          let isPublic = false;
          if (currentLocale === defaultLocale) {
            isPublic = pathname === '/login' || pathname === '/';
          } else {
            isPublic = pathname === `/${currentLocale}/login` || pathname === `/${currentLocale}/` || pathname === `/${currentLocale}`;
          }
          
          const isNextInternalPath = pathname.startsWith('/_next/');
          
          if (!isPublic && !isNextInternalPath) {
            const loginRedirectPath = currentLocale === defaultLocale ? '/login' : `/${currentLocale}/login`;
            console.log(`[AuthProvider] User not logged in, not on public path. Redirecting to: ${loginRedirectPath}`);
            router.replace(loginRedirectPath);
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
  }, [router, toast, pathname, currentLocale]);

  const signInWithGoogle = async () => {
    if (isSigningIn) {
      console.log('[AuthProvider] Sign-in already in progress...');
      return;
    }
    
    setIsSigningIn(true);
    setLoading(true); // Set loading to true when sign-in starts
    
    try {
      const result = await signInWithPopup(auth, googleProvider);
      console.log('[AuthProvider] Successfully signed in:', result.user.email);
      toast({
        title: 'Welcome!',
        description: 'Successfully signed in with Google.',
        variant: 'default',
      });
      
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
      setLoading(false); 
    }
  };

  const signOut = async () => {
    if (loading) return; 
    
    setLoading(true);
    
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      const loginRedirectPath = currentLocale === defaultLocale ? '/login' : `/${currentLocale}/login`;
      router.replace(loginRedirectPath);
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
  
  let isOnPublicPath = false;
  if (currentLocale === defaultLocale) {
    isOnPublicPath = pathname === '/login' || pathname === '/';
  } else {
    isOnPublicPath = pathname === `/${currentLocale}/login` || pathname === `/${currentLocale}/` || pathname === `/${currentLocale}`;
  }


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
        signOut,
        currentLocale
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
