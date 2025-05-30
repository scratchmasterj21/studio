
"use client";

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale, type Locale } from '@/contexts/LocaleContext';
import { useTranslations } from '@/hooks/useTranslations';

export function LanguageSwitcher() {
  const { locale, setLocale, loadingLocale } = useLocale();
  const { t, isLoadingTranslations } = useTranslations('languageSwitcher'); // Using a namespace

  if (loadingLocale || isLoadingTranslations) {
    // Render a placeholder or null while loading to prevent hydration issues
    return (
        <Button variant="ghost" size="icon" disabled className="h-9 w-9">
         <Globe className="h-5 w-5" />
        </Button>
    );
  }

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale as Locale);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t('changeLanguage')} className="h-9 w-9">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuLabel>{t('changeLanguage')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={locale} onValueChange={handleLocaleChange}>
          <DropdownMenuRadioItem value="en">{t('english')}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ja">{t('japanese')}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
