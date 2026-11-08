import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import './globals.css';
import Providers from './providers';
import BottomNav from '@/components/BottomNav';
import FlashSaleBanner from '@/components/FlashSaleBanner';

export const metadata: Metadata = {
  metadataBase: new URL('https://draftee.in'),
  title: {
    default: 'Legal Notice, Cheque Bounce Draft Online India | Draftee',
    template: '%s | Draftee',
  },
  description:
    'AI-powered legal drafts for Indian advocates. Describe a situation, get a court-ready draft in seconds.',
  applicationName: 'Draftee',
  icons: { icon: '/logo.png' },
  openGraph: {
    siteName: 'Draftee',
    title: 'Legal Notice, Cheque Bounce Draft Online India | Draftee',
    description:
      'AI-powered legal drafts for Indian advocates. Describe a situation, get a court-ready draft in seconds.',
    url: 'https://draftee.in',
    type: 'website',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Legal Notice, Cheque Bounce Draft Online India | Draftee',
    description:
      'AI-powered legal drafts for Indian advocates. Describe a situation, get a court-ready draft in seconds.',
    images: ['/logo.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1564731389281588"
          crossOrigin="anonymous"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <FlashSaleBanner />
          <main style={{ paddingBottom: '72px' }}>{children}</main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
