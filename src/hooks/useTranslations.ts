
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useLocale, type Locale } from '@/contexts/LocaleContext';

// Define a type for your translation keys structure if possible, or use a generic one
// For simplicity, using Record<string, any> but a more specific type is better
type Translations = Record<string, any>; 

const loadedTranslations: Partial<Record<Locale, Translations>> = {};

export const useTranslations = (namespace?: string) => {
  const { locale, loadingLocale } = useLocale();
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loadingLocale) return; // Wait for locale to be determined

    const loadTranslations = async () => {
      setIsLoading(true);
      if (loadedTranslations[locale]) {
        setTranslations(loadedTranslations[locale]!);
        setIsLoading(false);
        return;
      }
      try {
        // Dynamically import the JSON file
        // Make sure your tsconfig.json has "resolveJsonModule": true and "esModuleInterop": true
        const module = await import(`@/locales/${locale}.json`);
        const data = module.default as Translations;
        loadedTranslations[locale] = data;
        setTranslations(data);
      } catch (error) {
        console.error(`Could not load translations for locale "${locale}":`, error);
        // Fallback to English if current locale fails, and English hasn't failed before
        if (locale !== 'en' && !loadedTranslations['en']) {
          try {
            const enModule = await import(`@/locales/en.json`);
            const enData = enModule.default as Translations;
            loadedTranslations['en'] = enData;
            setTranslations(enData);
          } catch (enError) {
            console.error(`Could not load fallback English translations:`, enError);
            setTranslations({}); // Empty object if all fails
          }
        } else if (locale !== 'en' && loadedTranslations['en']) {
           setTranslations(loadedTranslations['en']!); // Use cached English
        } else {
           setTranslations({}); // Empty if 'en' itself failed
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [locale, loadingLocale]);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    if (isLoading || !translations) {
      return key; // Or a loading indicator string
    }

    let translation = key
      .split('.')
      .reduce((obj, k) => (obj && obj[k] !== 'undefined' ? obj[k] : undefined), namespace ? translations[namespace] : translations);

    if (translation === undefined) {
      console.warn(`Translation not found for key: "${namespace ? namespace + '.' : ''}${key}" in locale "${locale}"`);
      return key; // Return key if not found
    }
    
    if (typeof translation !== 'string') {
        console.warn(`Translation for key: "${namespace ? namespace + '.' : ''}${key}" in locale "${locale}" is not a string.`);
        return key;
    }


    if (params) {
      Object.keys(params).forEach(paramKey => {
        translation = translation.replace(new RegExp(`{${paramKey}}`, 'g'), String(params[paramKey]));
      });
    }

    return translation;
  }, [translations, locale, isLoading, namespace]);

  return { t, isLoadingTranslations: isLoading, currentLocale: locale };
};
