
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Changed back to next/navigation
import { useAuth } from '@/components/auth/AuthProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter(); 

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">Loading FireDesk...</p>
    </div>
  );
}
