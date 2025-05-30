
"use client";

import { useEffect } from 'react';
import { useRouter as useNextRouter } from 'next/navigation'; 
import { SignInButton } from '@/components/auth/SignInButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Ticket } from 'lucide-react';
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations
import { useLocale } from '@/contexts/LocaleContext'; // Import useLocale

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useNextRouter(); 
  const { t, isLoadingTranslations } = useTranslations('loginPage'); // Use translations for 'loginPage' namespace
  const { loadingLocale } = useLocale();


  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard'); 
    }
  }, [user, loading, router]);

  if (loading || (!loading && user) || loadingLocale || isLoadingTranslations) {
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
          <CardTitle className="text-3xl font-bold">{t('title')}</CardTitle>
          <CardDescription className="text-lg">
            {t('description')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 p-8">
          <SignInButton />
          <p className="text-xs text-muted-foreground">
            {t('terms')}
          </p>
        </CardContent>
      </Card>
       <footer className="mt-8 text-center text-sm text-muted-foreground">
        {t('footer', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
