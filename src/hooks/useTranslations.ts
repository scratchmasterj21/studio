
"use client";

import { useEffect, useState, useCallback } from 'react';
import { useLocale, type Locale } from '@/contexts/LocaleContext';

// Define a type for your translation keys structure if possible, or use a generic one
// For simplicity, using Record<string, any> but a more specific type is better
type Translations = Record<string, any>; 

const loadedTranslations: Partial<Record<Locale, Record<string, Translations>>> = { // Store namespaces
  en: {},
  ja: {},
};

export const useTranslations = (namespace?: string) => {
  const { locale, loadingLocale } = useLocale();
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (loadingLocale) return; // Wait for locale to be determined

    const loadTranslations = async () => {
      setIsLoading(true);
      // Check if namespace is already loaded for the current locale
      if (namespace && loadedTranslations[locale]?.[namespace]) {
        setTranslations(loadedTranslations[locale]![namespace]!);
        setIsLoading(false);
        return;
      }
      // Check if base translations (no namespace) are loaded
      if (!namespace && loadedTranslations[locale]?.['__base__']) {
        setTranslations(loadedTranslations[locale]!['__base__']!);
        setIsLoading(false);
        return;
      }

      try {
        const module = await import(`@/locales/${locale}.json`);
        const allTranslationsForLocale = module.default as Record<string, Translations>; // Assuming structure { namespace1: {...}, namespace2: {...} } or flat

        if (!loadedTranslations[locale]) {
          loadedTranslations[locale] = {};
        }

        let specificTranslations;
        if (namespace) {
          specificTranslations = allTranslationsForLocale[namespace];
          if (specificTranslations) {
            loadedTranslations[locale]![namespace] = specificTranslations;
          } else {
            console.warn(`Namespace "${namespace}" not found in locale "${locale}". Loading base translations.`);
            specificTranslations = allTranslationsForLocale; // Fallback to all if namespace missing
            loadedTranslations[locale]!['__base__'] = specificTranslations; // Cache base if namespace not found
          }
        } else {
          specificTranslations = allTranslationsForLocale;
          loadedTranslations[locale]!['__base__'] = specificTranslations;
        }
        
        setTranslations(specificTranslations || {});

      } catch (error) {
        console.error(`Could not load translations for locale "${locale}" (namespace: ${namespace || 'base'}):`, error);
        // Fallback logic can be more sophisticated, e.g., trying to load 'en' if current locale fails
        setTranslations({}); // Empty object if all fails
      } finally {
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [locale, loadingLocale, namespace]);

  const t = useCallback((key: string, paramsOrFallback?: Record<string, string | number> | string): string => {
    if (isLoading || !translations) {
      // If still loading or translations are null, decide on fallback.
      // If paramsOrFallback is a string, it's intended as a fallback.
      return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
    }

    // Resolve the translation string from the potentially nested translations object
    let translation = key
      .split('.')
      .reduce((obj, k) => (obj && typeof obj === 'object' && obj[k] !== undefined ? obj[k] : undefined), translations as any);

    if (translation === undefined) {
      // console.warn(`Translation not found for key: "${namespace ? namespace + '.' : ''}${key}" in locale "${locale}". Using fallback.`);
      return typeof paramsOrFallback === 'string' ? paramsOrFallback : key;
    }
    
    if (typeof translation !== 'string') {
        // console.warn(`Translation for key: "${namespace ? namespace + '.' : ''}${key}" in locale "${locale}" is not a string. Found:`, translation);
        return typeof paramsOrFallback === 'string' ? paramsOrFallback : key; // Fallback if found value isn't a string
    }

    // Perform interpolation only if paramsOrFallback is an object
    if (paramsOrFallback && typeof paramsOrFallback === 'object' && !Array.isArray(paramsOrFallback)) {
      let result = translation;
      Object.keys(paramsOrFallback).forEach(paramKey => {
        if (paramKey === "") { // Prevent issues with empty keys
            console.warn(`[useTranslations] Attempting to interpolate with an empty paramKey for key "${key}". Skipping this parameter.`);
            return; 
        }
        // Construct regex to be safe: escape curly braces and the paramKey itself if it could contain special characters
        // For simple placeholders like {name}, this is robust.
        const placeholder = `{${paramKey}}`;
        // Basic escape for common regex special characters in placeholder, then build RegExp
        const escapedPlaceholder = placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
          const regex = new RegExp(escapedPlaceholder, 'g');
          result = result.replace(regex, String(paramsOrFallback[paramKey]));
        } catch (e) {
            console.error(`[useTranslations] Error creating/using RegExp for key "${key}", placeholder "${placeholder}":`, e);
        }
      });
      return result;
    }

    return translation; // Return the found translation if no (object) params are provided
  }, [translations, locale, isLoading, namespace]);

  return { t, isLoadingTranslations: isLoading || loadingLocale, currentLocale: locale };
};
