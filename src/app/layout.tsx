
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client'; // Corrected to client
import { getCurrentLocale as getCurrentLocaleServer, getI18n } from '@/lib/i18n/server'; // Corrected to server
import type { Locale } from '@/lib/i18n/settings';
import { locales, defaultLocale } from '@/lib/i18n/settings';

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
  return {
    title: {
      default: t('header.appName'),
      template: `%s | ${t('header.appName')}`,
    },
    description: "A Help Desk Ticketing System built with Next.js and Firebase.",
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale?: string };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<RootLayoutProps>) {
  const paramsLocale = params.locale;
  console.log(`[RootLayout] Received params.locale: "${paramsLocale}" (Type: ${typeof paramsLocale})`);

  let localeToUse: Locale;
  let serverDeterminedLocale: string | undefined;

  try {
    serverDeterminedLocale = await getCurrentLocaleServer();
    console.log(`[RootLayout] getCurrentLocaleServer() returned: "${serverDeterminedLocale}" (Type: ${typeof serverDeterminedLocale})`);

    if (serverDeterminedLocale && locales.includes(serverDeterminedLocale as Locale)) {
      localeToUse = serverDeterminedLocale as Locale;
    } else if (paramsLocale && paramsLocale !== 'undefined' && typeof paramsLocale === 'string' && locales.includes(paramsLocale as Locale)) {
      localeToUse = paramsLocale as Locale;
      console.warn(`[RootLayout] Using params.locale: "${localeToUse}" because serverDeterminedLocale ("${serverDeterminedLocale}") was invalid or not recognized.`);
    } else {
      localeToUse = defaultLocale;
      console.warn(`[RootLayout] Using defaultLocale: "${localeToUse}" (params.locale was "${paramsLocale}", serverDeterminedLocale was "${serverDeterminedLocale}").`);
    }
  } catch (e) {
    console.error(`[RootLayout] Error during server locale determination: ${e}. Defaulting to: ${defaultLocale}`);
    localeToUse = defaultLocale;
  }

  // Final validation to ensure localeToUse is one of the supported locales
  if (!locales.includes(localeToUse)) {
    console.error(`[RootLayout] CRITICAL: localeToUse ended up as "${localeToUse}" which is invalid. Forcing defaultLocale: "${defaultLocale}".`);
    localeToUse = defaultLocale;
  }

  console.log(`[RootLayout] Effective locale for I18nProviderClient: "${localeToUse}" (Type: ${typeof localeToUse})`);

  return (
    <html lang={localeToUse} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <I18nProviderClient locale={localeToUse}>
          <AuthProvider locale={localeToUse}>
            {children}
            <Toaster />
          </AuthProvider>
        </I18nProviderClient>
      </body>
    </html>
  );
}
