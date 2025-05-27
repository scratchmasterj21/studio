
export const locales = ['en', 'ja'] as const;
export const defaultLocale = 'en';
export type Locale = (typeof locales)[number];

export function getLocaleConfig() {
  return {
    locales,
    defaultLocale,
    localeCookie: 'NEXT_LOCALE', // Optional: cookie name for storing user's preferred locale
    // Examples of other options:
    // basePath: '/app', // If your app is not at the root
    // localeDetector: (request, config) => { /* custom logic */ return 'en'; }, // Custom locale detection
  };
}
