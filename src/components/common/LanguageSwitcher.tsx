
"use client";

import { useChangeLocale, useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import type { Locale } from '@/lib/i18n/settings';
import { locales } from '@/lib/i18n/settings';

export default function LanguageSwitcher() {
  const changeLocale = useChangeLocale();
  const currentLocale = useCurrentLocale();

  const getLanguageName = (locale: Locale) => {
    switch (locale) {
      case 'en':
        return 'English';
      case 'ja':
        return '日本語 (Japanese)';
      default:
        return locale.toUpperCase();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change language">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => changeLocale(locale)}
            disabled={currentLocale === locale}
          >
            {getLanguageName(locale)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
