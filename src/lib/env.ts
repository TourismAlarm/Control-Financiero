import { z } from 'zod';

/**
 * Environment Variables Validation
 *
 * This file validates all required environment variables at build/startup time.
 * If any required variable is missing or invalid, the application will fail fast
 * with a descriptive error message.
 *
 * Benefits:
 * - Type-safe environment variables
 * - Early error detection (build-time validation)
 * - Centralized environment configuration
 * - Clear error messages for missing variables
 */

// Define the schema for server-side environment variables
const serverSchema = z.object({
  // Node.js environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase Configuration
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY is required for server-side operations',
  }),

  // NextAuth Configuration
  NEXTAUTH_SECRET: z.string().min(32, {
    message: 'NEXTAUTH_SECRET must be at least 32 characters long',
  }),
  NEXTAUTH_URL: z.string().url().optional(),

  // Google OAuth Configuration
  GOOGLE_CLIENT_ID: z.string().min(1, {
    message: 'GOOGLE_CLIENT_ID is required for Google authentication',
  }),
  GOOGLE_CLIENT_SECRET: z.string().min(1, {
    message: 'GOOGLE_CLIENT_SECRET is required for Google authentication',
  }),
});

// Define the schema for client-side environment variables
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Type definitions for environment variables
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

/**
 * Validate and parse environment variables
 * This function is called once at module load time
 */
function validateEnv(): ServerEnv {
  // Only validate server-side variables on the server
  if (typeof window === 'undefined') {
    try {
      const parsed = serverSchema.safeParse(process.env);

      if (!parsed.success) {
        console.error('❌ Invalid environment variables:');
        console.error(JSON.stringify(parsed.error.format(), null, 2));

        throw new Error(
          '❌ Environment validation failed. Please check your .env file.\n\n' +
          'Missing or invalid variables:\n' +
          parsed.error.issues
            .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
            .join('\n')
        );
      }

      return parsed.data;
    } catch (error) {
      // If validation fails, log error and exit in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Fatal: Environment validation failed');
        process.exit(1);
      }
      throw error;
    }
  }

  // For client-side, only validate public variables
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    throw new Error(
      '❌ Client environment validation failed:\n' +
      parsed.error.issues
        .map((err) => `  - ${err.path.join('.')}: ${err.message}`)
        .join('\n')
    );
  }

  // Return a partial object for client (TypeScript will see this as ServerEnv but server-only fields will be undefined)
  return {
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  } as ServerEnv;
}

// Validate environment variables immediately
const validatedEnv = validateEnv();

/**
 * Typed and validated environment variables
 * Use these instead of process.env directly
 *
 * Server-only variables (GOOGLE_CLIENT_ID, etc.) are available in server code
 * and will throw descriptive errors if missing.
 */
export const env = {
  // Node environment (available everywhere)
  NODE_ENV: validatedEnv.NODE_ENV,
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test',

  // Supabase (available everywhere)
  NEXT_PUBLIC_SUPABASE_URL: validatedEnv.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: validatedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,

  // Server-only variables (validated at build time, guaranteed to exist on server)
  SUPABASE_SERVICE_ROLE_KEY: validatedEnv.SUPABASE_SERVICE_ROLE_KEY,
  NEXTAUTH_SECRET: validatedEnv.NEXTAUTH_SECRET,
  NEXTAUTH_URL: validatedEnv.NEXTAUTH_URL,
  GOOGLE_CLIENT_ID: validatedEnv.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: validatedEnv.GOOGLE_CLIENT_SECRET,
};

/**
 * Helper to check if we're on the server
 */
export const isServer = typeof window === 'undefined';

/**
 * Type-safe way to access server environment variables
 * This will give you autocomplete and type checking
 */
export type Env = typeof env;

export default env;
