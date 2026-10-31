/**
 * Verifies the configured Supabase and email credentials before you rely on
 * them. Reads .env.local, never prints a secret, and changes nothing: the
 * Supabase check is a read, and the email check only asks Resend who the key
 * belongs to.
 *
 *   node scripts/check-connection.mjs
 */
import { readFileSync } from 'node:fs';

const ENV_FILE = '.env.local';

function loadEnv(file) {
  const vars = {};
  let contents;
  try {
    contents = readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  for (const line of contents.split('\n')) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    vars[key] = rawValue.trim().replace(/^["']|["']$/g, '').replace(/\s+#.*$/, '');
  }
  return vars;
}

/** Shows only enough of a secret to tell two keys apart. */
function fingerprint(value) {
  if (!value) return 'missing';
  return `${value.slice(0, 4)}…${value.slice(-4)} (${value.length} chars)`;
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? 'OK  ' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const env = loadEnv(ENV_FILE);
if (!env) {
  console.error(`No se encontró ${ENV_FILE}. Cópialo de .env.example y rellénalo.`);
  process.exit(1);
}

console.log('Variables');
for (const key of [
  'NEXT_PUBLIC_APP_URL',
  'BUSINESS_TIMEZONE',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'EMAIL_TRANSPORT',
  'RESEND_API_KEY',
  'EMAIL_FROM',
]) {
  const value = env[key];
  const isSecret = key.includes('KEY');
  record(key, Boolean(value), value ? (isSecret ? fingerprint(value) : value) : 'sin valor');
}

const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
if (supabaseKey.startsWith('sb_publishable_') || supabaseKey.startsWith('eyJ') === false && supabaseKey.includes('publishable')) {
  console.error(
    '\n  ERROR: SUPABASE_SERVICE_ROLE_KEY contiene una clave "publishable".\n' +
    '  Esa es la clave pública (sustituye a la antigua anon) y no puede leer nada\n' +
    '  con RLS activado. Necesitas la clave secreta:\n' +
    '  Supabase > Project Settings > API Keys > secret (sb_secret_...).',
  );
}

console.log('\nSupabase');
if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/appointments?select=id&limit=1`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );
    if (response.ok) {
      record('lectura de appointments', true, 'la tabla existe y la clave funciona');
    } else {
      const body = await response.text();
      const hint = body.includes('does not exist')
        ? 'la clave funciona pero falta la migración: npm run db:push'
        : `HTTP ${response.status}`;
      record('lectura de appointments', false, hint);
    }
  } catch (error) {
    record('conexión', false, error.message);
  }
} else {
  record('conexión', false, 'faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
}

console.log('\nEmail');
if (env.EMAIL_TRANSPORT === 'console') {
  record('transporte', true, 'console: los correos se escriben en .dev-emails/');
} else if (env.RESEND_API_KEY && !env.RESEND_API_KEY.includes('placeholder')) {
  try {
    const response = await fetch('https://api.resend.com/domains', {
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    });
    if (response.ok) {
      const { data } = await response.json();
      const verified = (data ?? []).filter((domain) => domain.status === 'verified');
      record('clave de Resend', true, `${verified.length} dominio(s) verificado(s)`);
      for (const domain of data ?? []) {
        console.log(`        · ${domain.name}: ${domain.status}`);
      }
      if (verified.length === 0) {
        console.log('        Sin dominio verificado solo puedes enviarte correos a ti.');
      }
    } else if (response.status === 401) {
      const body = await response.json().catch(() => ({}));
      if (body.name === 'restricted_api_key') {
        // A send-only key cannot list domains. That is the recommended setup,
        // and the error itself proves the key is valid.
        record('clave de Resend', true, 'válida, con permisos solo de envío');
        console.log('        No se pueden listar dominios con esta clave; es lo esperado.');
      } else {
        record('clave de Resend', false, 'HTTP 401: la clave no es válida');
      }
    } else {
      record('clave de Resend', false, `HTTP ${response.status}`);
    }
  } catch (error) {
    record('clave de Resend', false, error.message);
  }
} else {
  record('clave de Resend', false, 'RESEND_API_KEY sin configurar');
}

const failed = results.filter((result) => !result.ok);
console.log(`\n${results.length - failed.length} de ${results.length} comprobaciones OK`);
process.exit(failed.length === 0 ? 0 : 1);
