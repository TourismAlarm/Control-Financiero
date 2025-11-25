'use client';

import { useState, useMemo } from 'react';
import { Bell, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Lightbulb, Calendar, X, ChevronRight, CheckCircle, Database } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useBudgets } from '@/hooks/useBudgets';
import { useCategories } from '@/hooks/useCategories';
import { useAgentNotifications } from '@/hooks/useAgentNotifications';
import { generateSmartNotifications, getNotificationSummary, type SmartNotification } from '@/lib/agents/smartNotifications';

interface SmartNotificationsProps {
  onNavigate?: (path: string) => void;
  maxVisible?: number;
  showPersisted?: boolean; // Mostrar notificaciones de BD o calculadas en tiempo real
}

export function SmartNotifications({ onNavigate, maxVisible = 5, showPersisted = true }: SmartNotificationsProps) {
  const { transactions } = useTransactions();
  const { budgets } = useBudgets();
  const { categories } = useCategories();
  const { notifications: persistedNotifications, dismissNotification } = useAgentNotifications();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Notificaciones calculadas en tiempo real
  const realtimeNotifications = useMemo(() => {
    if (transactions.length < 5) return [];
    return generateSmartNotifications(transactions, budgets, categories);
  }, [transactions, budgets, categories]);

  // Convertir notificaciones de BD al formato de SmartNotification
  const convertedPersistedNotifications = useMemo<SmartNotification[]>(() => {
    if (!showPersisted) return [];
    return persistedNotifications.map(n => ({
      id: n.id,
      type: n.type as any,
      priority: n.priority,
      title: n.title,
      message: n.message,
      actionable: n.data.actionable || false,
      action: n.data.action,
      createdAt: new Date(n.created_at),
      category: n.data.category,
      amount: n.data.amount,
      isPersisted: true, // Flag para distinguir notificaciones persistidas
    })) as SmartNotification[];
  }, [persistedNotifications, showPersisted]);

  // Combinar notificaciones: primero persistidas, luego tiempo real (evitando duplicados)
  const allNotifications = useMemo(() => {
    const persisted = convertedPersistedNotifications;
    const realtime = realtimeNotifications;

    // Crear un Set con los tipos de notificaciones persistidas para evitar duplicados
    const persistedTypes = new Set(persisted.map(n => `${n.type}-${n.category || n.amount}`));

    // Filtrar notificaciones en tiempo real que ya están persistidas
    const uniqueRealtime = realtime.filter(n =>
      !persistedTypes.has(`${n.type}-${n.category || n.amount}`)
    );

    return [...persisted, ...uniqueRealtime];
  }, [convertedPersistedNotifications, realtimeNotifications]);

  const visibleNotifications = useMemo(() => {
    return allNotifications
      .filter(n => !dismissedIds.has(n.id))
      .slice(0, maxVisible);
  }, [allNotifications, dismissedIds, maxVisible]);

  const summary = useMemo(() => getNotificationSummary(visibleNotifications), [visibleNotifications]);

  const handleDismiss = (id: string, e: React.MouseEvent, isPersisted?: boolean) => {
    e.stopPropagation();

    if (isPersisted) {
      // Dismiss en BD
      dismissNotification(id);
    } else {
      // Dismiss local
      setDismissedIds(prev => new Set([...prev, id]));
    }
  };

  const handleAction = (notification: SmartNotification) => {
    if (notification.action?.type === 'navigate' && notification.action.payload) {
      onNavigate?.(notification.action.payload);
    }
  };

  const getIcon = (type: SmartNotification['type']) => {
    switch (type) {
      case 'budget_exceeded':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'budget_warning':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'spending_spike':
        return <TrendingUp className="w-5 h-5 text-yellow-600" />;
      case 'positive_trend':
      case 'savings_goal':
        return <TrendingDown className="w-5 h-5 text-green-500" />;
      case 'bill_reminder':
        return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'insight':
        return <Lightbulb className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityStyles = (priority: SmartNotification['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-red-300 bg-red-50';
      case 'medium':
        return 'border-orange-300 bg-orange-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeLabel = (type: SmartNotification['type']) => {
    switch (type) {
      case 'budget_exceeded': return 'Presupuesto excedido';
      case 'budget_warning': return 'Alerta de presupuesto';
      case 'spending_spike': return 'Pico de gastos';
      case 'positive_trend': return 'Tendencia positiva';
      case 'savings_goal': return 'Meta de ahorro';
      case 'bill_reminder': return 'Gasto recurrente';
      case 'insight': return 'Consejo';
      default: return 'Notificación';
    }
  };

  if (transactions.length < 5) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold">Notificaciones Inteligentes</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Se necesitan más transacciones para generar notificaciones</p>
          <p className="text-sm mt-2">Tienes {transactions.length} transacciones registradas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold">Notificaciones Inteligentes</h3>
          {summary.high > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              {summary.high} urgente{summary.high > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {summary.total > 0 && (
          <span className="text-sm text-gray-500">
            {summary.total} notificación{summary.total > 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Quick Stats */}
      {summary.total > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {summary.high > 0 && (
            <span className="flex-shrink-0 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              {summary.high} alta prioridad
            </span>
          )}
          {summary.medium > 0 && (
            <span className="flex-shrink-0 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
              {summary.medium} media prioridad
            </span>
          )}
          {summary.actionable > 0 && (
            <span className="flex-shrink-0 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              {summary.actionable} accionables
            </span>
          )}
        </div>
      )}

      {/* Notifications List */}
      {visibleNotifications.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="text-green-700 font-medium">Todo en orden</p>
          <p className="text-sm text-gray-500 mt-1">No hay alertas o notificaciones pendientes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((notification) => {
            const isExpanded = expandedId === notification.id;

            return (
              <div
                key={notification.id}
                className={`border rounded-lg overflow-hidden transition-all ${getPriorityStyles(notification.priority)}`}
              >
                {/* Notification Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : notification.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {getIcon(notification.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{notification.title}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/50 text-gray-600">
                            {getTypeLabel(notification.type)}
                          </span>
                          {(notification as any).isPersisted && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1" title="Notificación persistente">
                              <Database className="w-3 h-3" />
                              Guardada
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDismiss(notification.id, e, (notification as any).isPersisted)}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded transition-colors"
                      title="Descartar"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200/50 bg-white/30">
                    <div className="pt-4">
                      {/* Amount if available */}
                      {notification.amount && (
                        <div className="mb-3 p-2 bg-white rounded-lg">
                          <span className="text-sm text-gray-500">Monto relacionado: </span>
                          <span className="font-semibold text-gray-900">€{notification.amount.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Category if available */}
                      {notification.category && (
                        <div className="mb-3 text-sm">
                          <span className="text-gray-500">Categoría: </span>
                          <span className="font-medium text-gray-700">{notification.category}</span>
                        </div>
                      )}

                      {/* Action Button */}
                      {notification.actionable && notification.action && (
                        <button
                          onClick={() => handleAction(notification)}
                          className="flex items-center gap-2 w-full justify-center py-2 px-4 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
                        >
                          {notification.action.label}
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Show more indicator */}
      {allNotifications.length > maxVisible && (
        <p className="text-xs text-gray-500 text-center mt-4">
          +{allNotifications.length - maxVisible} notificación(es) más
        </p>
      )}

      {/* Dismissed count */}
      {dismissedIds.size > 0 && (
        <p className="text-xs text-gray-500 text-center mt-2">
          {dismissedIds.size} notificación(es) descartada(s)
        </p>
      )}
    </div>
  );
}
