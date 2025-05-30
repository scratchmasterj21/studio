
"use client";

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth/AuthProvider';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useTranslations } from '@/hooks/useTranslations'; // Import useTranslations

interface SignOutButtonProps {
  asDropdownItem?: boolean;
  translationKey?: string; // Optional, for custom key if needed, defaults to 'header.signOut'
}

export function SignOutButton({ asDropdownItem = false, translationKey }: SignOutButtonProps) {
  const { signOut, loading } = useAuth();
  const { t, isLoadingTranslations } = useTranslations('header'); // Assuming 'signOut' key is in 'header' namespace

  const buttonText = isLoadingTranslations ? "Loading..." : t(translationKey || 'signOut');

  if (asDropdownItem) {
    return (
      <DropdownMenuItem onClick={signOut} disabled={loading}>
        <LogOut className="mr-2 h-4 w-4" />
        {buttonText}
      </DropdownMenuItem>
    );
  }

  return (
    <Button variant="ghost" onClick={signOut} disabled={loading}>
      <LogOut className="mr-2 h-4 w-4" />
      {buttonText}
    </Button>
  );
}
