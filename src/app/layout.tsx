
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getCurrentLocale, getI18n } from '@/lib/i18n/server'; // getCurrentLocale from server
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
  const t = await getI18n(); // Fetch translations on the server
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
  params: { locale?: string }; // params.locale might be undefined for default locale
}

export default async function RootLayout({
  children,
  // params is available but we will primarily rely on getCurrentLocale from the server i18n setup
}: Readonly<RootLayoutProps>) {
  
  let localeToUse: Locale;
  try {
    const serverDeterminedLocale = await getCurrentLocale(); // This is from your @/lib/i18n/server.ts
    
    // Explicitly check if serverDeterminedLocale is the string "undefined"
    if (typeof serverDeterminedLocale === 'string' && serverDeterminedLocale.toLowerCase() === 'undefined') {
      console.warn(`[RootLayout] getCurrentLocale() returned the string "undefined". Defaulting to: ${defaultLocale}`);
      localeToUse = defaultLocale;
    } else if (locales.includes(serverDeterminedLocale as Locale)) {
      localeToUse = serverDeterminedLocale as Locale;
    } else {
      // This handles cases where serverDeterminedLocale is undefined, null, 
      // or an unsupported string
      console.warn(`[RootLayout] Locale from server ("${serverDeterminedLocale}") is not valid or not in supported locales [${locales.join(', ')}]. Defaulting to: ${defaultLocale}`);
      localeToUse = defaultLocale;
    }
  } catch (e) {
    // Catch any error during locale determination (e.g., if getCurrentLocale throws)
    console.error(`[RootLayout] Error fetching server locale: ${e}. Defaulting to: ${defaultLocale}`);
    localeToUse = defaultLocale;
  }
  
  // This log is crucial to verify what value is being passed to I18nProviderClient
  console.log(`[RootLayout] Effective locale for I18nProviderClient: "${localeToUse}" (type: ${typeof localeToUse})`);

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
