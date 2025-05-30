
"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { AppHeader } from '@/components/layout/AppHeader';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useLocale } from '@/contexts/LocaleContext'; // Import useLocale

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { loadingLocale } = useLocale();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  if (authLoading || !user || !userProfile || loadingLocale) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  
  // Basic check for redirecting from root or login if already authenticated
  if (pathname === '/login' || pathname === '/') {
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
         FireDesk © {new Date().getFullYear()} {/* This could also be translated if footer text is complex */}
      </footer>
    </div>
  );
}
