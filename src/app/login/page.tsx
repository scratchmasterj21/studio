
"use client";

import { useEffect } from 'react';
import { useRouter as useNextRouter } from 'next/navigation'; // Keep for initial non-locale router if needed
import { useRouter } from 'next-international/navigation';
import { useCurrentLocale, useI18n } from '@/lib/i18n/client';
import { SignInButton } from '@/components/auth/SignInButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket } from 'lucide-react';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard'); // next-international router handles locale
    }
  }, [user, loading, router, currentLocale]);

  if (loading || (!loading && user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
         {/* You can add a LoadingSpinner here if desired */}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Ticket size={32} />
          </div>
          <CardTitle className="text-3xl font-bold">{t('login.title')}</CardTitle>
          <CardDescription className="text-lg">
            {t('login.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-8">
          <SignInButton />
          <p className="text-xs text-muted-foreground">
            {t('login.terms')}
          </p>
        </CardContent>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
        {t('login.copyrightYear', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
