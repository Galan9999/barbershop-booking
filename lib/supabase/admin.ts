import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/lib/supabase/types';

/**
 * Service-role client. Bypasses RLS — server-only by construction:
 * importing this from a Client Component fails the build.
 */
export const supabaseAdmin = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/** Postgres unique_violation — our slot-taken signal from the partial index. */
export const PG_UNIQUE_VIOLATION = '23505';
