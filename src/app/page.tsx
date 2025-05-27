
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next-international/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useI18n();
  const locale = useCurrentLocale();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router, locale]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-muted-foreground">{t('common.loadingFireDesk')}</p>
    </div>
  );
}
