
"use client";

import { useEffect } from 'react';
import { useRouter as useNextRouter } from 'next/navigation'; 
import { useAuth } from '@/components/auth/AuthProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { defaultLocale } from '@/lib/i18n/settings';

export default function HomePage() {
  const { user, loading, currentLocale } = useAuth(); // Get currentLocale from AuthProvider
  const router = useNextRouter(); 

  useEffect(() => {
    if (!loading) {
      let targetPath;
      if (user) {
        targetPath = currentLocale === defaultLocale ? '/dashboard' : `/${currentLocale}/dashboard`;
        router.replace(targetPath);
      } else {
        targetPath = currentLocale === defaultLocale ? '/login' : `/${currentLocale}/login`;
        router.replace(targetPath);
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
