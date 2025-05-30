
"use client";

import { Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

export function SignInButton() {
  const { signInWithGoogle, loading } = useAuth();
  const { t, isLoadingTranslations } = useTranslations('loginPage'); // Assuming key is in 'loginPage'

  return (
    <Button onClick={signInWithGoogle} disabled={loading || isLoadingTranslations} className="w-full sm:w-auto" size="lg">
      <Chrome className="mr-2 h-5 w-5" />
      {isLoadingTranslations ? "Loading..." : t('signInWithGoogle')}
    </Button>
  );
}
