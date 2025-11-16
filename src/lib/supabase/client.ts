import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { env } from '../env';

/**
 * Supabase client for client-side components
 * Use this in Client Components and hooks
 *
 * Environment variables are validated at build time via env.ts
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
