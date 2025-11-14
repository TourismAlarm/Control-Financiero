import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    // Verificar variables de entorno
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Supabase credentials',
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
        },
        { status: 500 }
      );
    }

    // Crear cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

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
