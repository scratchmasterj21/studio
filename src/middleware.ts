import { createI18nMiddleware } from 'next-international/middleware';
import { NextRequest } from 'next/server';

const I18nMiddleware = createI18nMiddleware({
  locales: ['en', 'ja'],
  defaultLocale: 'en',
  // Optional: exclude certain paths from locale handling
  // exclude: ['/api', '/_next', '/favicon.ico']
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