import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: { default: siteConfig.name, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        style={{ background: siteConfig.pageBackground }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
