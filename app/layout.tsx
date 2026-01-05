import '../styles/globals.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';
import ClientOnlyToaster from '@/components/ClientOnlyToaster';

export const metadata: Metadata = {
  title: {
    default: 'Success Class | Orbit AI Meetings',
    template: '%s',
  },
  description:
    'Success Class is a video conferencing platform designed for education, powered by Orbit AI.',
  twitter: {
    creator: '@orbit_ai',
    site: '@orbit_ai',
    card: 'summary_large_image',
  },
  openGraph: {
    url: 'https://successclass.ai',
    images: [
      {
        url: 'https://successclass.ai/images/success-class-open-graph.png',
        width: 2000,
        height: 1000,
        type: 'image/png',
      },
    ],
    siteName: 'Success Class',
  },
  icons: {
    icon: {
      rel: 'icon',
      url: '/images/success-class-open-graph.png',
    },
    apple: [
      {
        rel: 'apple-touch-icon',
        url: '/images/success-class-apple-touch.png',
        sizes: '180x180',
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#070707',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body data-lk-theme="default">
        <ClientOnlyToaster />
        {children}
      </body>
    </html>
  );
}
