import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { BUSINESS_NAME } from '@/shared/config/business.config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: `${BUSINESS_NAME} — Reservas`,
  description: `Reserva tu cita en ${BUSINESS_NAME} en menos de un minuto.`,
};

/** Mobile-first: most visitors arrive from the QR code on a phone. */
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
