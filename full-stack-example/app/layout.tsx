import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI University - Course Registration',
  description: 'Register for the most cutting-edge AI courses',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {children}
      </body>
    </html>
  );
}
