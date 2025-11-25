/**
 * Anomaly Detection Agent
 * Detects duplicates, fraud suspects, and unusual patterns
 */

export interface Anomaly {
  id: string;
  type: 'duplicate' | 'fraud_suspect' | 'unusual_amount' | 'unusual_timing' | 'unusual_frequency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  transactionIds: string[];
  title: string;
  description: string;
  confidence: number; // 0-100
  suggestedAction: 'review' | 'delete' | 'flag' | 'ignore';
  details: Record<string, any>;
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  description: string;
  date: string;
  category?: { name: string } | null;
}

// Levenshtein distance for string similarity
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = [];

  // Initialize array properly
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      dp[i]![j] = 0;
    }
  }

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = Math.min(
          dp[i - 1]![j - 1]! + 1,
          dp[i - 1]![j]! + 1,
          dp[i]![j - 1]! + 1
        );
      }
    }
  }

  return dp[m]![n]!;
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - (distance / maxLength);
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Detect potential duplicate transactions
export function detectDuplicates(transactions: Transaction[], windowDays: number = 7): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const checked = new Set<string>();

  for (let i = 0; i < transactions.length; i++) {
    const t1 = transactions[i]!;
    if (checked.has(t1.id)) continue;

    const duplicateGroup: Transaction[] = [t1];

    for (let j = i + 1; j < transactions.length; j++) {
      const t2 = transactions[j]!;
      if (checked.has(t2.id)) continue;

      // Check if amounts are similar (within 1 cent)
      const amountMatch = Math.abs(Math.abs(t1.amount) - Math.abs(t2.amount)) < 0.02;
      if (!amountMatch) continue;

      // Check if within time window
      const date1 = new Date(t1.date);
      const date2 = new Date(t2.date);
      const daysDiff = Math.abs((date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > windowDays) continue;

      // Check description similarity
      const similarity = calculateSimilarity(t1.description, t2.description);
      if (similarity < 0.7) continue;

      duplicateGroup.push(t2);
      checked.add(t2.id);
    }

    if (duplicateGroup.length > 1) {
      checked.add(t1.id);
      const first = duplicateGroup[0]!;
      const second = duplicateGroup[1]!;
      const similarity = duplicateGroup.length > 2 ? 95 :
        Math.round(calculateSimilarity(first.description, second.description) * 100);

      anomalies.push({
        id: generateId(),
        type: 'duplicate',
        severity: similarity > 90 ? 'high' : 'medium',
        transactionIds: duplicateGroup.map(t => t.id),
        title: 'Posibles transacciones duplicadas',
        description: `${duplicateGroup.length} transacciones similares de €${Math.abs(t1.amount).toFixed(2)} encontradas`,
        confidence: similarity,
        suggestedAction: similarity > 90 ? 'review' : 'flag',
        details: {
          amount: t1.amount,
          description: t1.description,
          dates: duplicateGroup.map(t => t.date),
          similarity,
        },
      });
    }
  }

  return anomalies;
}

// Detect unusual amounts using Z-score
export function detectUnusualAmounts(transactions: Transaction[], threshold: number = 2.5): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Group by type
  const expenses = transactions.filter(t => t.type === 'expense');
  const incomes = transactions.filter(t => t.type === 'income');

  function analyzeGroup(group: Transaction[], typeName: string): void {
    if (group.length < 10) return; // Need enough data

    const amounts = group.map(t => Math.abs(t.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return; // All same amount

    group.forEach(t => {
      const amount = Math.abs(t.amount);
      const zScore = (amount - mean) / stdDev;

      if (Math.abs(zScore) > threshold) {
        const isHigh = zScore > 0;
        anomalies.push({
          id: generateId(),
          type: 'unusual_amount',
          severity: Math.abs(zScore) > 4 ? 'critical' : Math.abs(zScore) > 3 ? 'high' : 'medium',
          transactionIds: [t.id],
          title: `${typeName} ${isHigh ? 'inusualmente alto' : 'inusualmente bajo'}`,
          description: `€${amount.toFixed(2)} está ${Math.abs(zScore).toFixed(1)} desviaciones del promedio (€${mean.toFixed(2)})`,
          confidence: Math.min(95, Math.round(50 + Math.abs(zScore) * 10)),
          suggestedAction: 'review',
          details: {
            amount,
            mean,
            stdDev,
            zScore,
            description: t.description,
            date: t.date,
            category: t.category?.name || 'Sin categoría',
          },
        });
      }
    });
  }

  analyzeGroup(expenses, 'Gasto');
  analyzeGroup(incomes, 'Ingreso');

  return anomalies;
}

// Detect unusual timing patterns
export function detectUnusualTiming(transactions: Transaction[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Group transactions by day of week
  const dayCount: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const dayAmounts: Record<number, number[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  transactions.forEach(t => {
    const day = new Date(t.date).getDay();
    dayCount[day] = (dayCount[day] ?? 0) + 1;
    const amounts = dayAmounts[day] ?? [];
    amounts.push(Math.abs(t.amount));
    dayAmounts[day] = amounts;
  });

  // Find unusual days (much more spending than average)
  const avgPerDay = transactions.length / 7;
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  Object.entries(dayCount).forEach(([day, count]) => {
    if (count > avgPerDay * 2 && count > 5) {
      const dayNum = parseInt(day);
      const amounts = dayAmounts[dayNum] ?? [];
      const totalAmount = amounts.reduce((a, b) => a + b, 0);
      const dayName = dayNames[dayNum] ?? 'Desconocido';

      anomalies.push({
        id: generateId(),
        type: 'unusual_timing',
        severity: 'low',
        transactionIds: [],
        title: `Alta actividad los ${dayName}`,
        description: `${count} transacciones (${((count / transactions.length) * 100).toFixed(0)}% del total) con €${totalAmount.toFixed(2)} gastados`,
        confidence: 70,
        suggestedAction: 'flag',
        details: {
          day: dayName,
          count,
          percentage: (count / transactions.length) * 100,
          totalAmount,
          avgAmount: totalAmount / count,
        },
      });
    }
  });

  return anomalies;
}

// Detect rapid spending (many transactions in short time)
export function detectRapidSpending(transactions: Transaction[], windowHours: number = 24, threshold: number = 5): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const sortedTrans = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  for (let i = 0; i < sortedTrans.length; i++) {
    const startTrans = sortedTrans[i];
    if (!startTrans) continue;

    const windowStart = new Date(startTrans.date).getTime();
    const windowEnd = windowStart + (windowHours * 60 * 60 * 1000);

    const windowTransactions: Transaction[] = [];
    let j = i;

    while (j < sortedTrans.length) {
      const currentTrans = sortedTrans[j];
      if (!currentTrans) break;
      if (new Date(currentTrans.date).getTime() > windowEnd) break;
      windowTransactions.push(currentTrans);
      j++;
    }

    if (windowTransactions.length >= threshold) {
      const totalAmount = windowTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const firstTrans = windowTransactions[0];
      const firstDate = firstTrans?.date ?? startTrans.date;

      // Avoid duplicate alerts for overlapping windows
      const existingAlert = anomalies.find(a =>
        a.type === 'unusual_frequency' &&
        a.transactionIds.some(id => windowTransactions.map(t => t.id).includes(id))
      );

      if (!existingAlert) {
        anomalies.push({
          id: generateId(),
          type: 'unusual_frequency',
          severity: windowTransactions.length >= 10 ? 'high' : 'medium',
          transactionIds: windowTransactions.map(t => t.id),
          title: 'Gasto rápido detectado',
          description: `${windowTransactions.length} transacciones (€${totalAmount.toFixed(2)}) en menos de ${windowHours} horas`,
          confidence: 75,
          suggestedAction: 'review',
          details: {
            count: windowTransactions.length,
            totalAmount,
            startDate: firstDate,
            windowHours,
            transactions: windowTransactions.map(t => ({
              description: t.description,
              amount: t.amount,
              date: t.date,
            })),
          },
        });
      }

      // Skip ahead to avoid too many overlapping alerts
      i = j - 1;
    }
  }

  return anomalies;
}

// Main function to run all detections
export function runAnomalyDetection(transactions: Transaction[]): Anomaly[] {
  if (transactions.length < 10) {
    return []; // Not enough data
  }

  const allAnomalies: Anomaly[] = [
    ...detectDuplicates(transactions),
    ...detectUnusualAmounts(transactions),
    ...detectUnusualTiming(transactions),
    ...detectRapidSpending(transactions),
  ];

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return allAnomalies.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));
}

// Get summary stats
export function getAnomalySummary(anomalies: Anomaly[]): {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};

  anomalies.forEach(a => {
    byType[a.type] = (byType[a.type] || 0) + 1;
  });

  return {
    total: anomalies.length,
    critical: anomalies.filter(a => a.severity === 'critical').length,
    high: anomalies.filter(a => a.severity === 'high').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    low: anomalies.filter(a => a.severity === 'low').length,
    byType,
  };
}
