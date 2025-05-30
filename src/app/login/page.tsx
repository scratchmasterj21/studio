
"use client";

import { useEffect } from 'react';
import { useRouter as useNextRouter, usePathname } from 'next/navigation'; 
import { SignInButton } from '@/components/auth/SignInButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useNextRouter(); // Using Next.js router for base path redirects
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    if (!loading && user) {
      // The middleware should handle locale prefixing if necessary for /dashboard
      router.replace('/dashboard'); 
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
          <CardTitle className="text-3xl font-bold">{t('loginPage.title')}</CardTitle>
          <CardDescription className="text-lg">
            {t('loginPage.description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-8">
          <SignInButton />
          <p className="text-xs text-muted-foreground">
            {t('loginPage.terms')}
          </p>
        </CardContent>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
        {t('loginPage.footer', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
