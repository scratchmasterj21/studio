
import type { NextRequest } from 'next/server';
import { createI18nMiddleware } from 'next-international/middleware';
import { getLocaleConfig } from '@/lib/i18n/settings';

const I18nMiddleware = createI18nMiddleware({
  locales: getLocaleConfig().locales,
  defaultLocale: getLocaleConfig().defaultLocale,
  // Optionally, you can customize URL handling:
  // urlMappingStrategy: 'rewrite', // 'redirect' or 'rewrite'
  // trailingSlash: false,
});

export function middleware(request: NextRequest) {
  return I18nMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|assets).*)'],
};
