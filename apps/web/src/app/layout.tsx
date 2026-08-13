import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orders and Settlements',
  description: 'Track orders, payments, refunds, and settlements.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
