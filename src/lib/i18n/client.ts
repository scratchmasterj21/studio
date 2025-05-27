
'use client';
import { createI18nClient } from 'next-international/client';
// We don't need getLocaleConfig here for createI18nClient
// import { getLocaleConfig } from './settings'; 

export const { useI18n, useScopedI18n, I18nProviderClient, useChangeLocale, useCurrentLocale } = createI18nClient(
  {
    en: () => import('@/locales/en'),
    ja: () => import('@/locales/ja'),
  }
);

