
"use client";

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n/client';

interface SignOutButtonProps {
  asDropdownItem?: boolean;
}

export function SignOutButton({ asDropdownItem = false }: SignOutButtonProps) {
  const { signOut, loading } = useAuth();
  const t = useI18n();

  if (asDropdownItem) {
    return (
      <DropdownMenuItem onClick={signOut} disabled={loading}>
        <LogOut className="mr-2 h-4 w-4" />
        {t('header.signOut')}
      </DropdownMenuItem>
    );
  }

  return (
    <Button variant="ghost" onClick={signOut} disabled={loading}>
      <LogOut className="mr-2 h-4 w-4" />
      {t('header.signOut')}
    </Button>
  );
}
