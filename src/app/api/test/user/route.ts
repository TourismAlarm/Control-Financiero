import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/auth.config';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/test/user
 * Test endpoint to verify user data in database
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id; // Google ID

    // Fetch user from users table
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('google_id', userId)
      .single();

    if (userError) {
      return NextResponse.json({
        error: 'User not found in database',
        details: userError,
        session: {
          google_id: userId,
          email: session.user.email,
          name: session.user.name,
        },
      }, { status: 404 });
    }

    // Fetch profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    return NextResponse.json({
      session: {
        google_id: userId,
        email: session.user.email,
        name: session.user.name,
      },
      user_in_database: user,
      profile_in_database: profile || null,
      profile_error: profileError || null,
      message: '✅ User found in database with Google ID',
    });
  } catch (error: any) {
    console.error('❌ GET /api/test/user error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
