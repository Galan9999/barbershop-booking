/**
 * Renders the confirmation email with sample data and serves it, so the
 * template can be reviewed without sending anything to anyone.
 *
 *   npm run email:preview
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';

const TEMPLATE_PATH =
  'src/modules/booking/infrastructure/templates/confirmation.template.ts';
const OUTPUT_PATH = '.dev-emails/preview.html';
const PORT = Number(process.env.PREVIEW_PORT ?? 3200);

// The template is plain string building, so stripping the type annotations is
// enough to run it here without a TypeScript build step.
const source = readFileSync(TEMPLATE_PATH, 'utf8');
const executable = source
  .replace(/export interface [\s\S]*?\n}\n/g, '')
  .replace(/: ConfirmationEmailData/g, '')
  .replace(/: string/g, '')
  .replace(/export function/g, 'function');

const template = new Function(
  `${executable}; return { renderConfirmationHtml, renderConfirmationSubject, renderConfirmationText };`,
)();

const sample = {
  clientName: 'Carles Galan',
  barberName: 'Carlos',
  businessName: 'Barbería Central',
  businessAddress: 'Calle Mayor 1, Madrid',
  formattedDateTime: 'miércoles, 11 de noviembre de 2026, 11:00',
  googleCalendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
  cancelUrl: 'http://localhost:3000/cancel/8e9037ea-f81b-4eb7-a9e9-2d17664d6add',
};

const html = template.renderConfirmationHtml(sample);
mkdirSync('.dev-emails', { recursive: true });
writeFileSync(OUTPUT_PATH, html);

console.log(`Asunto: ${template.renderConfirmationSubject(sample)}`);
console.log('\n--- versión en texto plano ---');
console.log(template.renderConfirmationText(sample));
console.log(`\nGuardado en ${OUTPUT_PATH}`);

createServer((_request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  response.end(html);
}).listen(PORT, () => {
  console.log(`Vista previa en http://localhost:${PORT}  (Ctrl+C para salir)`);
});
