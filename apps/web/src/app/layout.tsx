import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrossVal — Order operations',
  description: 'Create, collect, and reconcile customer orders with CrossVal.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
