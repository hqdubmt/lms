import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { siteConfig } from '@/config/site';

const inter = Inter({ subsets: ['latin', 'vietnamese'], display: 'swap' });

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={inter.className}
        style={{ background: siteConfig.pageBackground }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
