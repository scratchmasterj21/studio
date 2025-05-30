
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useLocale } from '@/contexts/LocaleContext'; // Import useLocale

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter(); 
  const { loadingLocale } = useLocale(); // Get locale loading state

  useEffect(() => {
    if (!authLoading && !loadingLocale) { // Wait for both auth and locale to be ready
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, authLoading, router, loadingLocale]);

  // Show loading spinner while auth or locale is loading
  if (authLoading || loadingLocale) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-muted-foreground">Loading FireDesk...</p>
      </div>
    );
  }

  // Fallback content if redirection doesn't happen immediately (should be rare)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  );
}
