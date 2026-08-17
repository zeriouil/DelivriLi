import type { Metadata, Viewport } from 'next';
import { Playfair_Display_SC, Karla } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/cart-context';

const playfair = Playfair_Display_SC({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-heading',
  display: 'swap',
});

const karla = Karla({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#dc2626',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Digital Menu PWA',
  description: 'A lightning-fast, mobile-first interactive restaurant menu and ordering system.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Digital Menu',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" dir="ltr" className={`antialiased scroll-smooth ${playfair.variable} ${karla.variable}`}>
      <body className={`${karla.className} min-h-[100dvh] bg-[#fef2f2] text-[#450a0a] selection:bg-amber-200 selection:text-amber-900`}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
