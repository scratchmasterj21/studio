
"use client";

import type { Dispatch, ReactNode, SetStateAction} from 'react';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type Locale = 'en' | 'ja';

interface LocaleContextType {
  locale: Locale;
  setLocale: Dispatch<SetStateAction<Locale>>;
  loadingLocale: boolean;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const defaultLocale: Locale = 'en';
const supportedLocales: Locale[] = ['en', 'ja'];

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [loadingLocale, setLoadingLocale] = useState(true);

  useEffect(() => {
    const storedLocale = localStorage.getItem('locale') as Locale | null;
    if (storedLocale && supportedLocales.includes(storedLocale)) {
      setLocale(storedLocale);
    } else {
      // Basic browser language detection as a fallback
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'ja') {
        setLocale('ja');
        localStorage.setItem('locale', 'ja');
      } else {
        setLocale('en');
        localStorage.setItem('locale', 'en');
      }
    }
    setLoadingLocale(false);
  }, []);

  useEffect(() => {
    if (!loadingLocale) { // Only update localStorage if it's not the initial load
      localStorage.setItem('locale', locale);
      document.documentElement.lang = locale; // Update HTML lang attribute
    }
  }, [locale, loadingLocale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, loadingLocale }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
