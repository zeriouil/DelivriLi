import type { Metadata, Viewport } from 'next';
import { Lalezar, Tajawal } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/cart-context';

const lalezar = Lalezar({
  subsets: ['arabic', 'latin'],
  weight: ['400'],
  variable: '--font-heading',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '700', '800', '900'],
  variable: '--font-body',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#c1440e',
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
    <html lang="ar" dir="ltr" className={`antialiased scroll-smooth ${lalezar.variable} ${tajawal.variable}`}>
      <body className={`${tajawal.className} min-h-[100dvh] text-[#2b2320] selection:bg-amber-200 selection:text-amber-900`} style={{background:'#f5ede0'}}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
