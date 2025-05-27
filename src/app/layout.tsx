
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getI18n, getCurrentLocale } from '@/lib/i18n/server';
import { locales, defaultLocale } from '@/lib/i18n/settings'; // Import defaultLocale

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

export default async function RootLayout({ // Made this async
  children,
  params: { locale: paramsLocale } 
}: Readonly<{
  children: React.ReactNode;
  params: { locale: string }; 
}>) {
  let effectiveLocale = paramsLocale;

  // Validate or determine locale
  if (!locales.includes(effectiveLocale as any)) {
    effectiveLocale = await getCurrentLocale(); // Await the result
  }
  
  // Final fallback if somehow still invalid, though getCurrentLocale should handle it
  if (!locales.includes(effectiveLocale as any)) {
    effectiveLocale = defaultLocale;
  }
  
  return (
    <html lang={effectiveLocale} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Use the resolved effectiveLocale for the I18nProviderClient */}
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
