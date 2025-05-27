
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getCurrentLocale as getCurrentLocaleServer } from '@/lib/i18n/server'; // Renamed for clarity
import { locales, defaultLocale, type Locale } from '@/lib/i18n/settings';
import { getI18n } from '@/lib/i18n/server'; // For metadata

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  const siteName = t('header.firedesk');
  return {
    title: {
      default: siteName,
      template: `%s | ${siteName}`,
    },
    description: t('login.description'), // Or a more general site description
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({
  children,
  // params object is still available if needed, but we'll primarily use getCurrentLocaleServer
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { locale?: string };
}>) {
  let effectiveLocale: Locale;

  // Primary source of truth should be what the server middleware has determined.
  const serverDeterminedLocale = await getCurrentLocaleServer();

  if (locales.includes(serverDeterminedLocale as Locale)) {
    effectiveLocale = serverDeterminedLocale as Locale;
  } else {
    // This is a fallback, should ideally not be hit if middleware is correct
    console.warn(
      `[RootLayout] Server-determined locale '${serverDeterminedLocale}' is not in supported locales (${locales.join(', ')}). Falling back to default: '${defaultLocale}'.`
    );
    effectiveLocale = defaultLocale;
  }
  
  // A final sanity check, though the above logic should cover it.
  // This ensures effectiveLocale is always one of the explicitly defined locales.
  if (!locales.includes(effectiveLocale)) {
     console.error(`[RootLayout] Critical fallback: effectiveLocale '${effectiveLocale}' is not a supported locale. Forcing defaultLocale '${defaultLocale}'. This indicates a problem in locale determination logic or middleware.`);
    effectiveLocale = defaultLocale;
  }
  
  return (
    <html lang={effectiveLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Pass the definitively resolved 'en' or 'ja' string to I18nProviderClient */}
        <I18nProviderClient locale={effectiveLocale}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </I18nProviderClient>
      </body>
    </html>
  );
}
