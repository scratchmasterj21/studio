
"use client";

import { Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { useI18n } from '@/lib/i18n/client';

export function SignInButton() {
  const { signInWithGoogle, loading } = useAuth();
  const t = useI18n();

  return (
    <Button onClick={signInWithGoogle} disabled={loading} className="w-full sm:w-auto" size="lg">
      <Chrome className="mr-2 h-5 w-5" />
      {t('login.signInWithGoogle')}
    </Button>
  );
}
