
import { createI18nServer } from 'next-international/server';
// We don't need getLocaleConfig here for createI18nServer
// import { getLocaleConfig } from './settings';
 
export const { getI18n, getScopedI18n, getStaticParams, getCurrentLocale } = createI18nServer(
  {
    en: () => import('@/locales/en'),
    ja: () => import('@/locales/ja'),
  }
);

