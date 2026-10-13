import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'ClaimLens AI | Healthcare Claim Intelligence & Fraud Detection',
  description:
    'AI-assisted healthcare claim intelligence platform for real-time validation, duplicate detection, unbundling scrutiny, and automated settlement workflows.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 font-sans antialiased text-slate-900 selection:bg-teal-100 selection:text-teal-900">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
