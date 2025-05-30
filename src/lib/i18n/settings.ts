
export const locales = ['en', 'ja'] as const;
export const defaultLocale = 'en';

export type Locale = (typeof locales)[number];

export function getLocaleConfig() {
  return {
    locales,
    defaultLocale,
    localeCookie: 'NEXT_LOCALE', // Optional: cookie name for storing locale preference
    // Other configurations for next-international if needed
  };
}
