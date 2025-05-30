
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getCurrentLocale as getCurrentLocaleServer, getI18n } from '@/lib/i18n/server'; // Aliased
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
  
  let localeToUse: Locale;

  try {
    // This should be the primary source of truth after middleware.
    const serverDeterminedLocale = await getCurrentLocaleServer(); 
    
    if (locales.includes(serverDeterminedLocale as Locale)) {
      localeToUse = serverDeterminedLocale as Locale;
    } else {
      // This case means getCurrentLocaleServer() returned something unexpected (e.g. string "undefined")
      console.warn(`[RootLayout] getCurrentLocaleServer() returned "${serverDeterminedLocale}", which is not a supported locale. Attempting fallback.`);
      if (params.locale && locales.includes(params.locale as Locale)) {
        localeToUse = params.locale as Locale;
         console.warn(`[RootLayout] Fallback to params.locale: "${localeToUse}".`);
      } else {
        localeToUse = defaultLocale;
        console.warn(`[RootLayout] Fallback to defaultLocale: "${localeToUse}" (params.locale was "${params.locale}").`);
      }
    }
  } catch (e) {
    console.error(`[RootLayout] Error during server locale determination: ${e}. Defaulting to: ${defaultLocale}`);
    localeToUse = defaultLocale;
  }
  
  // Final check to ensure localeToUse is one of the strictly defined locales.
  if (!locales.includes(localeToUse)) {
    console.error(`[RootLayout] CRITICAL: localeToUse ended up as "${localeToUse}" which is invalid. Forcing defaultLocale: "${defaultLocale}".`);
    localeToUse = defaultLocale;
  }

  console.log(`[RootLayout] Effective locale for I18nProviderClient: "${localeToUse}" (Type: ${typeof localeToUse})`);

  return (
    <html lang={localeToUse} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <I18nProviderClient locale={localeToUse}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </I18nProviderClient>
      </body>
    </html>
  );
}
