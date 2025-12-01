import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: {
    default: 'AudioNest - 프리미엄 오디오 콘텐츠 플랫폼',
    template: '%s | AudioNest',
  },
  description:
    '오디오북, 팟캐스트, 지식 콘텐츠를 한곳에서. 언제 어디서나 프리미엄 오디오 경험을 즐기세요.',
  keywords: ['오디오북', '팟캐스트', 'ASMR', '오디오 콘텐츠', '자기계발', '영어회화'],
  authors: [{ name: 'AudioNest' }],
  creator: 'AudioNest',
  publisher: 'AudioNest',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://audionest.com'),
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://audionest.com',
    siteName: 'AudioNest',
    title: 'AudioNest - 프리미엄 오디오 콘텐츠 플랫폼',
    description:
      '오디오북, 팟캐스트, 지식 콘텐츠를 한곳에서. 언제 어디서나 프리미엄 오디오 경험을 즐기세요.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AudioNest',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AudioNest - 프리미엄 오디오 콘텐츠 플랫폼',
    description: '오디오북, 팟캐스트, 지식 콘텐츠를 한곳에서.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
