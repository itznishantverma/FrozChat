import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FrozChat - Anonymous Chat with Strangers Worldwide',
  description: 'Connect with strangers around the world through secure, anonymous chat. No signup required. Start meaningful conversations instantly with FrozChat.',
  keywords: 'anonymous chat, stranger chat, private messaging, secure chat, instant chat, global chat',
  openGraph: {
    title: 'FrozChat - Anonymous Chat with Strangers Worldwide',
    description: 'Connect with strangers around the world through secure, anonymous chat. No signup required.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}