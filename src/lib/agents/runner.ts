/**
 * Agent Runner - Ejecuta todos los agentes y procesa resultados
 * Se ejecuta automáticamente cuando hay cambios en transacciones
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { runAnomalyDetection, type Anomaly } from './anomalyDetection';
import { generateSmartNotifications, type SmartNotification } from './smartNotifications';

interface AgentRunResult {
  userId: string;
  anomalies: Anomaly[];
  notifications: SmartNotification[];
  criticalAnomalies: Anomaly[];
  highPriorityNotifications: SmartNotification[];
}

/**
 * Ejecuta todos los agentes para un usuario
 */
export async function runAllAgents(userId: string): Promise<AgentRunResult> {
  try {
    // Obtener todas las transacciones del usuario
    const { data: transactions } = await supabaseAdmin
      .from('transactions')
      .select('*, category:categories(id, name, type, icon, color)')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (!transactions || transactions.length < 5) {
      return {
        userId,
        anomalies: [],
        notifications: [],
        criticalAnomalies: [],
        highPriorityNotifications: [],
      };
    }

    // Obtener categorías
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    // Obtener presupuestos
    const { data: budgets } = await supabaseAdmin
      .from('budgets')
      .select('*, category:categories(id, name)')
      .eq('user_id', userId);

    // Transformar datos al formato esperado por los agentes
    const transactionsForAgents = transactions.map(t => ({
      id: t.id,
      amount: t.amount,
      type: t.type as 'income' | 'expense',
      description: t.description,
      date: t.date,
      category: t.category ? { id: t.category.id, name: t.category.name } : null,
      category_id: t.category_id,
    }));

    const categoriesForAgents = (categories || []).map(c => ({
      id: c.id,
      name: c.name,
      type: c.type as 'income' | 'expense',
    }));

    const budgetsForAgents = (budgets || []).map(b => ({
      id: b.id,
      category_id: b.category_id,
      amount: b.amount,
      category: b.category ? { name: b.category.name } : null,
    }));

    // Ejecutar agentes
    const anomalies = runAnomalyDetection(transactionsForAgents);
    const notifications = generateSmartNotifications(
      transactionsForAgents,
      budgetsForAgents,
      categoriesForAgents
    );

    // Filtrar elementos críticos/importantes
    const criticalAnomalies = anomalies.filter(
      a => a.severity === 'critical' || a.severity === 'high'
    );

    const highPriorityNotifications = notifications.filter(
      n => n.priority === 'high' || n.priority === 'medium'
    );

    return {
      userId,
      anomalies,
      notifications,
      criticalAnomalies,
      highPriorityNotifications,
    };
  } catch (error) {
    console.error('❌ Error running agents:', error);
    return {
      userId,
      anomalies: [],
      notifications: [],
      criticalAnomalies: [],
      highPriorityNotifications: [],
    };
  }
}

/**
 * Guarda notificaciones importantes en la base de datos
 */
export async function saveImportantNotifications(
  userId: string,
  notifications: SmartNotification[],
  anomalies: Anomaly[]
): Promise<void> {
  try {
    // Guardar solo notificaciones de alta/media prioridad
    const importantNotifications = notifications.filter(
      n => n.priority === 'high' || n.priority === 'medium'
    );

    if (importantNotifications.length === 0 && anomalies.length === 0) {
      return;
    }

    // Preparar datos para insertar
    const notificationsToInsert = [
      // Notificaciones
      ...importantNotifications.map(n => ({
        user_id: userId,
        type: n.type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        data: {
          actionable: n.actionable,
          action: n.action,
          category: n.category,
          amount: n.amount,
        },
        is_read: false,
        created_at: new Date().toISOString(),
      })),
      // Anomalías críticas/altas como notificaciones
      ...anomalies
        .filter(a => a.severity === 'critical' || a.severity === 'high')
        .map(a => ({
          user_id: userId,
          type: 'anomaly',
          priority: a.severity === 'critical' ? 'high' : 'medium',
          title: a.title,
          message: a.description,
          data: {
            anomalyType: a.type,
            confidence: a.confidence,
            transactionIds: a.transactionIds,
            details: a.details,
          },
          is_read: false,
          created_at: new Date().toISOString(),
        })),
    ];

    if (notificationsToInsert.length > 0) {
      // Insertar notificaciones
      const { error } = await supabaseAdmin
        .from('agent_notifications')
        .insert(notificationsToInsert);

      if (error) {
        console.error('❌ Error saving notifications:', error);
      } else {
        console.log(`✅ Saved ${notificationsToInsert.length} notifications for user ${userId}`);
      }
    }
  } catch (error) {
    console.error('❌ Error in saveImportantNotifications:', error);
  }
}

/**
 * Ejecuta agentes y guarda resultados (función principal)
 */
export async function runAgentsAndSave(userId: string): Promise<void> {
  const result = await runAllAgents(userId);

  // Guardar notificaciones importantes
  await saveImportantNotifications(
    userId,
    result.highPriorityNotifications,
    result.criticalAnomalies
  );

  // Log para debugging
  console.log(`🤖 Agents executed for user ${userId}:`, {
    totalAnomalies: result.anomalies.length,
    criticalAnomalies: result.criticalAnomalies.length,
    totalNotifications: result.notifications.length,
    highPriorityNotifications: result.highPriorityNotifications.length,
  });
}
