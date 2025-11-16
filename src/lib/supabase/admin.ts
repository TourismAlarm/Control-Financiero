import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

/**
 * Supabase Admin Client
 * Uses service role key to bypass RLS
 * ONLY use on server-side (API routes, server actions)
 *
 * Environment variables are validated at build time via env.ts
 */

export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
