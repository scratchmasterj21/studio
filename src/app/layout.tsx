
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/contexts/LocaleContext'; // Import LocaleProvider

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// For this simplified approach, metadata will be static English
// For fully dynamic metadata, a more complex server-side solution would be needed without next-international
export const metadata: Metadata = {
  title: {
    default: 'FireDesk', // Static title
    template: `%s | FireDesk`,
  },
  description: "A Help Desk Ticketing System built with Next.js and Firebase.",
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  return (
    // The lang attribute will be updated by LocaleProvider client-side
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <LocaleProvider> {/* Wrap with LocaleProvider */}
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
