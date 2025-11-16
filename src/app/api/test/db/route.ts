import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export async function GET() {
  try {
    // Environment variables are validated at build time via env.ts
    // No need for runtime checks - they're guaranteed to exist
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Intentar query simple
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supabase query failed',
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Supabase connection successful',
      profilesTableExists: true,
      queryResult: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unexpected error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
