import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/cart-context';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#059669',
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
    <html lang="en" className="antialiased scroll-smooth">
      <body className={`${inter.className} min-h-[100dvh] bg-slate-50 text-slate-900 selection:bg-emerald-200 selection:text-emerald-900`}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
