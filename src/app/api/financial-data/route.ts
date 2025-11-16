import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

/**
 * Types for Financial Data
 */
interface FinancialDataItem {
  id?: string;
  nombre: string;
  monto: number;
  categoria?: string;
  fecha?: string;
}

interface MonthlyHistoryItem {
  mes: string;
  ingresos_total: number;
  gastos_total: number;
  ahorro: number;
}

interface PostRequestBody {
  mesActual: string;
  ingresos?: FinancialDataItem[];
  gastosFijos?: FinancialDataItem[];
  gastosVariables?: FinancialDataItem[];
  deudas?: FinancialDataItem[];
  objetivos?: FinancialDataItem[];
  historial?: MonthlyHistoryItem[];
}

// GET - Obtener datos financieros del usuario
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mesActual = searchParams.get('mes') || new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const supabase = await createServerClient();

    // Obtener datos financieros del mes actual
    const { data: financialData, error: financialError } = await supabase
      .from('financial_data')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('mes_actual', mesActual)
      .maybeSingle();

    if (financialError && financialError.code !== 'PGRST116') {
      logger.error('Error obteniendo datos financieros:', financialError);
      return NextResponse.json({ error: financialError.message }, { status: 500 });
    }

    // Obtener historial mensual
    const { data: historyData, error: historyError } = await supabase
      .from('monthly_history')
      .select('historial')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (historyError && historyError.code !== 'PGRST116') {
      logger.error('Error obteniendo historial:', historyError);
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({
      financialData: financialData || {
        mes_actual: mesActual,
        ingresos: [],
        gastos_fijos: [],
        gastos_variables: [],
        deudas: [],
        objetivos: []
      },
      historial: historyData?.historial || []
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('Error en GET /api/financial-data:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST - Guardar/Actualizar datos financieros del usuario
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json() as PostRequestBody;
    const { mesActual, ingresos, gastosFijos, gastosVariables, deudas, objetivos, historial } = body;

    const supabase = await createServerClient();

    // Guardar/Actualizar datos financieros
    const { data: financialData, error: financialError } = await supabase
      .from('financial_data')
      .upsert({
        user_id: session.user.id,
        mes_actual: mesActual,
        ingresos: ingresos || [],
        gastos_fijos: gastosFijos || [],
        gastos_variables: gastosVariables || [],
        deudas: deudas || [],
        objetivos: objetivos || []
      }, {
        onConflict: 'user_id,mes_actual'
      })
      .select()
      .maybeSingle();

    if (financialError) {
      logger.error('Error guardando datos financieros:', financialError);
      return NextResponse.json({ error: financialError.message }, { status: 500 });
    }

    // Guardar/Actualizar historial mensual si se proporciona
    if (historial !== undefined) {
      const { error: historyError } = await supabase
        .from('monthly_history')
        .upsert({
          user_id: session.user.id,
          historial: historial || []
        }, {
          onConflict: 'user_id'
        });

      if (historyError) {
        logger.error('Error guardando historial:', historyError);
        return NextResponse.json({ error: historyError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      data: financialData
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('Error en POST /api/financial-data:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
