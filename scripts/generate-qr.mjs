/**
 * Generates the printable QR codes that send customers to the booking page.
 *
 *   npm run qr -- https://tu-app.vercel.app
 *   npm run qr -- https://tu-app.vercel.app --barbers
 *
 * Writes to qr/: an SVG and a PNG of the bare code, plus an A5 poster per
 * target. SVG is the one to send to a printer; it stays sharp at any size.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import QRCode from 'qrcode';

const OUTPUT_DIR = 'qr';

// High error correction: a printed code gets smudged, scratched and partly
// covered, and level H still scans with up to 30% of it damaged.
const QR_OPTIONS = {
  errorCorrectionLevel: 'H',
  margin: 2,
  color: { dark: '#1c1917', light: '#ffffff' },
};

/** Reads the shop's own name and barbers, so the poster matches the install. */
function readEnvFile(file) {
  const values = {};
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (match) {
        values[match[1]] = match[2].trim().replace(/^["']|["']$/g, '').replace(/\s+#.*$/, '');
      }
    }
  } catch {
    // No .env.local is fine: the defaults below apply.
  }
  return values;
}

const env = { ...readEnvFile('.env.local'), ...process.env };
const BUSINESS_NAME = env.BUSINESS_NAME || 'Barbería Central';
const BARBERS = (env.BUSINESS_BARBERS || 'Carlos, Miguel')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const ACCENT_COLOR = /^#[0-9a-f]{3,8}$/i.test(env.BUSINESS_COLOR_ACCENT ?? '')
  ? env.BUSINESS_COLOR_ACCENT
  : '#7c2d12';

function parseArguments(argv) {
  const positional = argv.filter((value) => !value.startsWith('--'));
  const flags = new Set(argv.filter((value) => value.startsWith('--')));
  return { baseUrl: positional[0], perBarber: flags.has('--barbers') };
}

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A5 poster, in millimetres, ready to print. */
function buildPoster({ qrSvg, heading, subheading, url }) {
  // Strip the wrapper so the code can be positioned inside the poster.
  const inner = qrSvg.replace(/<\?xml[\s\S]*?\?>/, '').replace(/<\/?svg[^>]*>/g, '');
  const viewBoxMatch = qrSvg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 33 33';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="148mm" height="210mm" viewBox="0 0 148 210">
  <rect width="148" height="210" fill="#faf8f5"/>
  <text x="74" y="26" text-anchor="middle" font-family="Georgia, serif" font-size="9"
        font-weight="bold" fill="#1c1917">${escapeXml(heading)}</text>
  <text x="74" y="38" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="5.5" letter-spacing="0.6" fill="${ACCENT_COLOR}">${escapeXml(subheading)}</text>

  <rect x="19" y="52" width="110" height="110" rx="4" fill="#ffffff" stroke="#e4ded4"/>
  <svg x="24" y="57" width="100" height="100" viewBox="${viewBox}">${inner}</svg>

  <text x="74" y="178" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="6" fill="#1c1917">Apunta con la cámara de tu móvil</text>
  <text x="74" y="188" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="4.5" fill="#6b6257">y reserva en menos de un minuto</text>
  <text x="74" y="200" text-anchor="middle" font-family="Helvetica, Arial, sans-serif"
        font-size="3.6" fill="#6b6257">${escapeXml(url)}</text>
</svg>`;
}

async function generateTarget({ url, slug, subheading }) {
  const svg = await QRCode.toString(url, { ...QR_OPTIONS, type: 'svg' });
  writeFileSync(join(OUTPUT_DIR, `${slug}.svg`), svg);

  // 1200px is enough for a sharp 10cm print at 300dpi.
  const png = await QRCode.toBuffer(url, { ...QR_OPTIONS, type: 'png', width: 1200 });
  writeFileSync(join(OUTPUT_DIR, `${slug}.png`), png);

  writeFileSync(
    join(OUTPUT_DIR, `${slug}-cartel.svg`),
    buildPoster({ qrSvg: svg, heading: BUSINESS_NAME, subheading, url }),
  );

  console.log(`  ${slug}: ${url}`);
}

const { baseUrl, perBarber } = parseArguments(process.argv.slice(2));

if (!baseUrl) {
  console.error('Falta la URL. Ejemplo:\n  npm run qr -- https://tu-app.vercel.app');
  process.exit(1);
}

let origin;
try {
  origin = new URL(baseUrl).origin;
} catch {
  console.error(`"${baseUrl}" no es una URL válida. Incluye https://`);
  process.exit(1);
}

if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
  console.error(
    'AVISO: esa URL es local. Un QR impreso que apunte a localhost no funciona\n' +
      'en el móvil de un cliente. Despliega primero y usa la URL pública.\n',
  );
}

mkdirSync(OUTPUT_DIR, { recursive: true });
console.log('Generando:');

await generateTarget({
  url: `${origin}/book`,
  slug: 'reservar',
  subheading: 'RESERVA TU CITA',
});

if (perBarber) {
  for (const barber of BARBERS) {
    await generateTarget({
      url: `${origin}/book?barber=${encodeURIComponent(barber)}`,
      slug: `reservar-${barber.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`,
      subheading: `CITA CON ${barber.toUpperCase()}`,
    });
  }
}

console.log(`\nArchivos en ${OUTPUT_DIR}/`);
console.log('Para imprimir usa los .svg (vectoriales, nítidos a cualquier tamaño).');
