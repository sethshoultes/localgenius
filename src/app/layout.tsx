import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'LocalGenius — Your business, handled.',
  description:
    'The AI employee that handles your marketing, reviews, social media, and more. Get started in 5 minutes.',
  applicationName: 'LocalGenius',
  metadataBase: new URL('https://localgenius.company'),
  openGraph: {
    title: 'LocalGenius — Your business, handled.',
    description:
      'The AI employee that handles your marketing, reviews, social media, and more. Get started in 5 minutes.',
    url: 'https://localgenius.company',
    siteName: 'LocalGenius',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'Your business, handled.' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LocalGenius — Your business, handled.',
    description:
      'The AI employee that handles your marketing, reviews, social media, and more. Get started in 5 minutes.',
    images: ['/og-image.svg'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LocalGenius',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#FAF8F5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-warm-white text-charcoal antialiased">
        {children}
      </body>
    </html>
  );
}
