
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getCurrentLocale, getI18n } from '@/lib/i18n/server'; // Assuming you have a server-side getCurrentLocale
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

// export const metadata: Metadata = {
//   title: {
//     default: "FireDesk",
//     template: "%s | FireDesk",
//   },
//   description: "A Help Desk Ticketing System built with Next.js and Firebase.",
// };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n(); // Fetch translations on the server
  return {
    title: {
      default: t('header.appName'),
      template: `%s | ${t('header.appName')}`,
    },
    description: "A Help Desk Ticketing System built with Next.js and Firebase.", // This could also be translated
  };
}


export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode;
  params: { locale: string }; // The locale will be injected by the middleware/routing
}

export default async function RootLayout({
  children,
  params,
}: Readonly<RootLayoutProps>) {
  // Determine effective locale: use params.locale if valid, otherwise server-determined, else default.
  let effectiveLocale: Locale = defaultLocale;
  const paramsLocale = params.locale as Locale | undefined;

  if (paramsLocale && locales.includes(paramsLocale) && paramsLocale !== 'undefined') {
    effectiveLocale = paramsLocale;
  } else {
    try {
      const serverLocale = await getCurrentLocale();
      if (locales.includes(serverLocale) && serverLocale !== 'undefined') {
        effectiveLocale = serverLocale;
      }
    } catch (error) {
      console.warn('[RootLayout] Could not determine locale from server, defaulting to:', defaultLocale, error);
    }
  }
  
  return (
    <html lang={effectiveLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
