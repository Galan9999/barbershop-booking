import type { ReactNode } from 'react';

export const metadata = {
  title: 'Barbería Central — Reservas',
  description: 'Reserva tu cita en Barbería Central.',
};

/** Mobile-first: the QR sends people here from a phone. */
export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      {/* Explicit light background: the UI uses dark text and must not inherit
          a dark system theme, which would make it unreadable. */}
      <body style={{ margin: 0, background: '#f4f4f5', colorScheme: 'light' }}>{children}</body>
    </html>
  );
}
