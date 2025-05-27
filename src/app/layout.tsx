
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getI18n, getCurrentLocale } from '@/lib/i18n/server';


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

export default function RootLayout({
  children,
  params: { locale: paramsLocale } // Renamed to avoid confusion with currentLocale
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string }; // This type comes from Next.js routing, locale can be undefined for default
}>) {
  const currentLocale = getCurrentLocale(); // This is the resolved locale from next-international
  return (
    <html lang={currentLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Use the resolved currentLocale for the I18nProviderClient */}
        <I18nProviderClient locale={currentLocale}>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </I18nProviderClient>
      </body>
    </html>
  );
}
