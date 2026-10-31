import { redirect } from 'next/navigation';

/** The QR points at /book; the bare domain just forwards there. */
export default function HomePage(): never {
  redirect('/book');
}
