/**
 * Smart Notifications Agent
 * Generates intelligent notifications based on spending patterns,
 * budget alerts, upcoming patterns, and financial insights
 */

export interface SmartNotification {
  id: string;
  type: 'budget_warning' | 'budget_exceeded' | 'spending_spike' | 'savings_goal' | 'unusual_activity' | 'positive_trend' | 'bill_reminder' | 'insight';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionable: boolean;
  action?: {
    label: string;
    type: 'navigate' | 'dismiss' | 'review';
    payload?: string;
  };
  createdAt: Date;
  expiresAt?: Date;
  category?: string;
  amount?: number;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id?: string | null;
  category?: { id: string; name: string } | null;
  date: string;
  description: string;
}

export interface Budget {
  id?: string;
  category_id: string;
  amount: number;
  category?: { name: string } | null;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

// Helper to generate unique IDs
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get current month's transactions
function getCurrentMonthTransactions(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return transactions.filter(t => t.date.startsWith(currentMonth));
}

// Get last N days transactions
function getLastNDaysTransactions(transactions: Transaction[], days: number): Transaction[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().substring(0, 10);

  return transactions.filter(t => t.date >= cutoffStr);
}

// Calculate spending by category for current month
function getMonthlySpendingByCategory(transactions: Transaction[]): Map<string, { amount: number; name: string }> {
  const monthlyTx = getCurrentMonthTransactions(transactions);
  const spending = new Map<string, { amount: number; name: string }>();

  monthlyTx
    .filter(t => t.type === 'expense')
    .forEach(t => {
      if (t.category_id) {
        const current = spending.get(t.category_id) || { amount: 0, name: t.category?.name || 'Sin categoría' };
        spending.set(t.category_id, {
          amount: current.amount + Math.abs(t.amount),
          name: current.name
        });
      }
    });

  return spending;
}

// Check budget status and generate warnings
function checkBudgetAlerts(
  transactions: Transaction[],
  budgets: Budget[]
): SmartNotification[] {
  const notifications: SmartNotification[] = [];
  const monthlySpending = getMonthlySpendingByCategory(transactions);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const monthProgress = currentDay / daysInMonth;

  budgets.forEach(budget => {
    const spending = monthlySpending.get(budget.category_id);
    if (!spending) return;

    const percentUsed = (spending.amount / budget.amount) * 100;
    const categoryName = budget.category?.name || spending.name;

    // Budget exceeded
    if (percentUsed >= 100) {
      notifications.push({
        id: generateId(),
        type: 'budget_exceeded',
        priority: 'high',
        title: `Presupuesto excedido: ${categoryName}`,
        message: `Has superado tu presupuesto de €${budget.amount.toFixed(2)} en ${categoryName}. Gasto actual: €${spending.amount.toFixed(2)} (${percentUsed.toFixed(0)}%)`,
        actionable: true,
        action: {
          label: 'Ver detalles',
          type: 'navigate',
          payload: '/budgets'
        },
        createdAt: new Date(),
        category: categoryName,
        amount: spending.amount
      });
    }
    // Budget warning (80-99% used)
    else if (percentUsed >= 80) {
      notifications.push({
        id: generateId(),
        type: 'budget_warning',
        priority: 'medium',
        title: `Alerta de presupuesto: ${categoryName}`,
        message: `Has usado el ${percentUsed.toFixed(0)}% de tu presupuesto en ${categoryName}. Te quedan €${(budget.amount - spending.amount).toFixed(2)}`,
        actionable: true,
        action: {
          label: 'Revisar gastos',
          type: 'navigate',
          payload: '/transactions'
        },
        createdAt: new Date(),
        category: categoryName,
        amount: spending.amount
      });
    }
    // Early warning (spending ahead of schedule)
    else if (percentUsed > (monthProgress * 100) + 20) {
      notifications.push({
        id: generateId(),
        type: 'budget_warning',
        priority: 'low',
        title: `Gasto acelerado: ${categoryName}`,
        message: `Estás gastando más rápido de lo esperado en ${categoryName}. A este ritmo, podrías superar tu presupuesto.`,
        actionable: true,
        action: {
          label: 'Ver tendencia',
          type: 'navigate',
          payload: '/statistics'
        },
        createdAt: new Date(),
        category: categoryName,
        amount: spending.amount
      });
    }
  });

  return notifications;
}

// Detect spending spikes
function detectSpendingSpikes(transactions: Transaction[]): SmartNotification[] {
  const notifications: SmartNotification[] = [];

  // Get last 7 days vs previous 7 days
  const last7Days = getLastNDaysTransactions(transactions, 7);
  const previous7Days = transactions.filter(t => {
    const date = new Date(t.date);
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo >= 7 && daysAgo < 14;
  });

  const recentSpending = last7Days
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const previousSpending = previous7Days
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Spike detection: more than 50% increase
  if (previousSpending > 0 && recentSpending > previousSpending * 1.5) {
    const increase = ((recentSpending - previousSpending) / previousSpending) * 100;
    notifications.push({
      id: generateId(),
      type: 'spending_spike',
      priority: 'medium',
      title: 'Incremento en gastos detectado',
      message: `Tus gastos de los últimos 7 días (€${recentSpending.toFixed(2)}) son un ${increase.toFixed(0)}% más altos que la semana anterior.`,
      actionable: true,
      action: {
        label: 'Analizar gastos',
        type: 'navigate',
        payload: '/statistics'
      },
      createdAt: new Date(),
      amount: recentSpending
    });
  }

  return notifications;
}

// Check for positive trends
function checkPositiveTrends(transactions: Transaction[]): SmartNotification[] {
  const notifications: SmartNotification[] = [];

  // Get last 30 days vs previous 30 days
  const last30Days = getLastNDaysTransactions(transactions, 30);
  const previous30Days = transactions.filter(t => {
    const date = new Date(t.date);
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return daysAgo >= 30 && daysAgo < 60;
  });

  const recentExpenses = last30Days
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const previousExpenses = previous30Days
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Positive trend: reduced spending by 10% or more
  if (previousExpenses > 0 && recentExpenses < previousExpenses * 0.9) {
    const decrease = ((previousExpenses - recentExpenses) / previousExpenses) * 100;
    notifications.push({
      id: generateId(),
      type: 'positive_trend',
      priority: 'low',
      title: '¡Buen trabajo ahorrando!',
      message: `Has reducido tus gastos un ${decrease.toFixed(0)}% respecto al mes anterior. ¡Sigue así!`,
      actionable: false,
      createdAt: new Date(),
      amount: previousExpenses - recentExpenses
    });
  }

  // Check savings rate
  const recentIncome = last30Days
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  if (recentIncome > 0) {
    const savingsRate = ((recentIncome - recentExpenses) / recentIncome) * 100;

    if (savingsRate >= 20) {
      notifications.push({
        id: generateId(),
        type: 'savings_goal',
        priority: 'low',
        title: '¡Meta de ahorro alcanzada!',
        message: `Tu tasa de ahorro este mes es del ${savingsRate.toFixed(0)}%. Estás en camino hacia tus objetivos financieros.`,
        actionable: false,
        createdAt: new Date(),
        amount: recentIncome - recentExpenses
      });
    }
  }

  return notifications;
}

// Generate financial insights
function generateInsights(transactions: Transaction[], categories: Category[]): SmartNotification[] {
  const notifications: SmartNotification[] = [];

  const monthlyTx = getCurrentMonthTransactions(transactions);

  if (monthlyTx.length < 5) return notifications;

  // Find top spending category
  const categorySpending = new Map<string, number>();
  monthlyTx
    .filter(t => t.type === 'expense' && t.category_id)
    .forEach(t => {
      const current = categorySpending.get(t.category_id!) || 0;
      categorySpending.set(t.category_id!, current + Math.abs(t.amount));
    });

  if (categorySpending.size > 0) {
    const sorted = Array.from(categorySpending.entries())
      .sort((a, b) => b[1] - a[1]);

    const topEntry = sorted[0];
    if (topEntry) {
      const topCategoryId = topEntry[0];
      const topAmount = topEntry[1];
      const totalExpenses = sorted.reduce((sum, [, amount]) => sum + amount, 0);
      const percentage = (topAmount / totalExpenses) * 100;

      const category = categories.find(c => c.id === topCategoryId);
      const categoryName = category?.name || 'Sin categoría';

      if (percentage > 40) {
        notifications.push({
          id: generateId(),
          type: 'insight',
          priority: 'low',
          title: 'Concentración de gastos',
          message: `El ${percentage.toFixed(0)}% de tus gastos este mes se concentran en "${categoryName}". Considera si puedes optimizar esta categoría.`,
          actionable: true,
          action: {
            label: 'Ver desglose',
            type: 'navigate',
            payload: '/statistics'
          },
          createdAt: new Date(),
          category: categoryName,
          amount: topAmount
        });
      }
    }
  }

  // Check for recurring patterns (potential bills)
  const descriptionCounts = new Map<string, { count: number; amounts: number[]; dates: string[] }>();
  transactions
    .filter(t => t.type === 'expense')
    .forEach(t => {
      const key = t.description.toLowerCase().trim();
      const current = descriptionCounts.get(key) || { count: 0, amounts: [], dates: [] };
      current.count++;
      current.amounts.push(Math.abs(t.amount));
      current.dates.push(t.date);
      descriptionCounts.set(key, current);
    });

  // Find potential recurring bills (same description, similar amounts, 3+ times)
  descriptionCounts.forEach((data, description) => {
    if (data.count >= 3) {
      const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length;
      const variance = data.amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / data.amounts.length;
      const stdDev = Math.sqrt(variance);

      // Low variance suggests recurring bill
      if (stdDev / avgAmount < 0.1) {
        notifications.push({
          id: generateId(),
          type: 'bill_reminder',
          priority: 'low',
          title: 'Gasto recurrente detectado',
          message: `"${description}" parece ser un gasto recurrente de aproximadamente €${avgAmount.toFixed(2)}. Considera añadirlo a tu presupuesto.`,
          actionable: true,
          action: {
            label: 'Crear presupuesto',
            type: 'navigate',
            payload: '/budgets'
          },
          createdAt: new Date(),
          amount: avgAmount
        });
      }
    }
  });

  return notifications;
}

// Main function to generate all notifications
export function generateSmartNotifications(
  transactions: Transaction[],
  budgets: Budget[],
  categories: Category[]
): SmartNotification[] {
  const allNotifications: SmartNotification[] = [];

  // Budget alerts
  allNotifications.push(...checkBudgetAlerts(transactions, budgets));

  // Spending spikes
  allNotifications.push(...detectSpendingSpikes(transactions));

  // Positive trends
  allNotifications.push(...checkPositiveTrends(transactions));

  // Financial insights
  allNotifications.push(...generateInsights(transactions, categories));

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return allNotifications.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

// Get notification summary
export function getNotificationSummary(notifications: SmartNotification[]): {
  total: number;
  high: number;
  medium: number;
  low: number;
  actionable: number;
} {
  return {
    total: notifications.length,
    high: notifications.filter(n => n.priority === 'high').length,
    medium: notifications.filter(n => n.priority === 'medium').length,
    low: notifications.filter(n => n.priority === 'low').length,
    actionable: notifications.filter(n => n.actionable).length
  };
}

// Filter notifications by type
export function filterNotificationsByType(
  notifications: SmartNotification[],
  types: SmartNotification['type'][]
): SmartNotification[] {
  return notifications.filter(n => types.includes(n.type));
}
