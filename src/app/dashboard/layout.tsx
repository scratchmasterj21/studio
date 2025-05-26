"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user || !userProfile) {
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
         FireDesk &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
