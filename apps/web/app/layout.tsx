import type { Metadata } from 'next';
import { ReactNode } from 'react';
import './globals.css';
import { Providers } from '@/components/providers';

export const metadata: Metadata = {
  title: 'LegalMitra',
  description: "India's AI-powered digital justice platform",
  manifest: '/manifest.webmanifest',
  applicationName: 'LegalMitra',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
