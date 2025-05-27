
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getI18n, getCurrentLocale as getCurrentLocaleServer } from '@/lib/i18n/server';
import { locales, defaultLocale, type Locale } from '@/lib/i18n/settings'; // Import defaultLocale

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
  params, // Use params object directly
}: Readonly<{
  children: React.ReactNode;
  params: { locale?: string }; // Explicitly make locale optional in the params type
}>) {
  const paramsLocale = params.locale; // This will be undefined (JS value) if segment is missing, or a string
  let effectiveLocale: Locale;

  if (paramsLocale && locales.includes(paramsLocale as Locale)) {
    effectiveLocale = paramsLocale as Locale;
  } else {
    // If paramsLocale is undefined, an empty string, or not a valid known locale, 
    // get it from server context (which should be reliable due to middleware)
    const serverDeterminedLocale = await getCurrentLocaleServer();
    if (locales.includes(serverDeterminedLocale as Locale)) {
      effectiveLocale = serverDeterminedLocale as Locale;
    } else {
      // Fallback to defaultLocale if server determination also somehow fails
      // This case should be rare if middleware is functioning correctly.
      console.warn(`[RootLayout] Server-determined locale '${serverDeterminedLocale}' not in supported locales. Falling back to default: '${defaultLocale}'.`);
      effectiveLocale = defaultLocale;
    }
  }
  
  // Final safeguard: ensure effectiveLocale is definitely one of the defined locales.
  // This primarily protects against unexpected values if the above logic had a flaw.
  if (!locales.includes(effectiveLocale)) {
    console.error(`[RootLayout] Critical error: effectiveLocale '${effectiveLocale}' is not a supported locale. Forcing defaultLocale '${defaultLocale}'. This indicates a problem in locale determination logic or middleware.`);
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
