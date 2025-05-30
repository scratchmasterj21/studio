
"use client";

import { useEffect } from 'react';
import { useRouter as useNextRouter } from 'next/navigation'; 
import { useAuth } from '@/components/auth/AuthProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useCurrentLocale } from '@/lib/i18n/client';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useNextRouter(); // Using Next.js router for base path redirects
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // The middleware should handle locale prefixing if necessary
        router.replace('/dashboard');
      } else {
        // The middleware should handle locale prefixing if necessary
        router.replace('/login');
      }
    }
  }, [user, loading, router, currentLocale]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">Loading FireDesk...</p>
    </div>
  );
}
