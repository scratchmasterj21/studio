
'use client';
import { createI18nClient } from 'next-international/client';
import { getLocaleConfig } from './settings';

export const { useI18n, useScopedI18n, I18nProviderClient, useChangeLocale, useCurrentLocale } = createI18nClient(
  getLocaleConfig()
);
