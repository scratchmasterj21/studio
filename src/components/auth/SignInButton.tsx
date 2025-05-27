
"use client";

import { Chrome } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';

export function SignInButton() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <Button onClick={signInWithGoogle} disabled={loading} className="w-full sm:w-auto" size="lg">
      <Chrome className="mr-2 h-5 w-5" />
      Sign in with Google
    </Button>
  );
}
