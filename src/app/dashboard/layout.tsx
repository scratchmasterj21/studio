
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next-international/navigation';
import { usePathname as useNextPathname } from 'next/navigation';
import { useCurrentLocale, useI18n } from '@/lib/i18n/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { AppHeader } from '@/components/layout/AppHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const t = useI18n();
  const nextPathname = useNextPathname(); // Raw pathname
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router, currentLocale]);

  if (loading || !user || !userProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // Remove locale prefix for non-default locales to check against base paths
  const basePath = nextPathname.startsWith(`/${currentLocale}/`) && currentLocale !== 'en'
    ? nextPathname.substring(`/${currentLocale}`.length)
    : nextPathname;

  if (basePath.startsWith('/login')) {
     // If somehow user is authenticated but on login page (e.g. browser back button), redirect
     router.replace('/dashboard');
     return (
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
     );
  }


  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 container mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {children}
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
         {t('footer.copyrightYear', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
