import type { ReactNode } from 'react';

export const metadata = { title: 'Barbería Central — Reservas' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
