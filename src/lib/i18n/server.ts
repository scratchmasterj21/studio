
import { createI18nServer } from 'next-international/server';
import { getLocaleConfig } from './settings';
 
export const { getI18n, getScopedI18n, getStaticParams, getCurrentLocale } = createI18nServer(
  getLocaleConfig()
);
