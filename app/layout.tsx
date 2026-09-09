import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import LayoutShell from '@/components/LayoutShell';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Koa Living Inventory — Barcode Management System',
  description: 'Automated Koa Living inventory management and barcode tracking',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 min-h-screen text-gray-900 antialiased`}>
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
