
import { type NextRequest } from 'next/server';
import { createI18nMiddleware } from 'next-international/middleware';
import { locales, defaultLocale } from '@/lib/i18n/settings';

const I18nMiddleware = createI18nMiddleware({
  locales: locales,
  defaultLocale: defaultLocale,
  // Optional: exclude certain paths from locale handling
  // e.g. '/api', '/_next', '/favicon.ico'
  // urlMappingStrategy: 'rewrite', // if you prefer not to show locale in URL for default
});

export function middleware(request: NextRequest) {
  // Let next-international handle the locale detection and routing
  return I18nMiddleware(request);
}

export const config = {
  matcher: [
    // Match all pathnames except for
    // - api routes
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
