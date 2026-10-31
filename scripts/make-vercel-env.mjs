/**
 * Writes vercel-env.txt: the variables for production, in the format Vercel's
 * "paste .env" box accepts. The file holds real secrets, so it is gitignored
 * and meant to be deleted once pasted.
 *
 *   npm run vercel:env -- https://tu-app.vercel.app
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE = '.env.local';
const TARGET = 'vercel-env.txt';
const VARIABLES = [
  'NEXT_PUBLIC_APP_URL',
  'BUSINESS_TIMEZONE',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EMAIL_TRANSPORT',
  'RESEND_API_KEY',
  'EMAIL_FROM',
  'BUSINESS_EMAIL',
];

const appUrl = process.argv[2];

const local = {};
for (const line of readFileSync(SOURCE, 'utf8').split('\n')) {
  const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (match) local[match[1]] = match[2].trim().replace(/\s+#.*$/, '');
}

// Production must not inherit the local values for these two.
const overrides = {
  EMAIL_TRANSPORT: 'resend',
  ...(appUrl ? { NEXT_PUBLIC_APP_URL: appUrl } : {}),
};

const lines = VARIABLES.map((name) => `${name}=${overrides[name] ?? local[name] ?? ''}`);
writeFileSync(TARGET, `${lines.join('\n')}\n`);

console.log(`Escrito ${TARGET} con ${VARIABLES.length} variables.`);
if (!appUrl) {
  console.log(
    '\nAVISO: no diste URL, así que NEXT_PUBLIC_APP_URL mantiene el valor local.\n' +
      'Esa variable acaba en los enlaces de cancelación de cada email: cámbiala\n' +
      'por la URL real antes del despliegue definitivo.',
  );
}
console.log('\nEste fichero contiene claves. Bórralo cuando lo hayas pegado.');
