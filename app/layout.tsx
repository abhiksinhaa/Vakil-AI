import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Draftee — Legal Draft Generator',
  description: 'Draftee — AI-powered legal draft generator for Indian lawyers',
  applicationName: 'Draftee',
  icons: { icon: '/logo.png' },
  openGraph: {
    title: 'Draftee — Legal Draft Generator',
    description:
      'AI-powered legal drafts for Indian advocates. Describe a situation, get a court-ready draft in seconds.',
  },
  twitter: {
    title: 'Draftee — Legal Draft Generator',
    description: 'AI-powered legal drafts for Indian advocates.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
