import 'server-only';
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().transform((u) => u.replace(/\/$/, '')),
  BUSINESS_TIMEZONE: z.string().min(1).default('Europe/Madrid'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** 'resend' sends for real; 'console' writes the email to .dev-emails/. */
  EMAIL_TRANSPORT: z.enum(['resend', 'console']).default('resend'),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(3),
  /** Where the shop receives each booking, with the calendar invitation. */
  BUSINESS_EMAIL: z.string().email(),
});

/**
 * Validated at module load: a missing variable fails the build, not a request.
 * The raw ZodError is unreadable in a deploy log, so it is rewritten into a
 * list of what is actually missing or malformed.
 */
function parseEnv() {
  const result = envSchema.safeParse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    BUSINESS_TIMEZONE: process.env.BUSINESS_TIMEZONE,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    EMAIL_TRANSPORT: process.env.EMAIL_TRANSPORT,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    BUSINESS_EMAIL: process.env.BUSINESS_EMAIL,
  });

  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
  throw new Error(
    `Configuración de entorno inválida.\n${problems}\n\n` +
      'En local: copia .env.example a .env.local y rellénalo.\n' +
      'En Vercel: Settings > Environment Variables.\n' +
      'Comprueba con: npm run check:connection',
  );
}

export const env = parseEnv();
