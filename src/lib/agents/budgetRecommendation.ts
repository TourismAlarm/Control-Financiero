/**
 * Budget Recommendation Agent
 * Analyzes spending patterns and suggests realistic budgets per category
 */

export interface BudgetRecommendation {
  categoryId: string;
  categoryName: string;
  currentBudget: number | null;
  recommendedBudget: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  historicalAvg: number;
  historicalStdDev: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  monthlyData: number[];
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category_id?: string | null;
  category?: { id: string; name: string } | null;
  date: string;
}

export interface Budget {
  id?: string;
  category_id: string;
  amount: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

// Helper functions
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = calculateAverage(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(calculateAverage(squareDiffs));
}

function calculateTrend(values: number[]): 'increasing' | 'stable' | 'decreasing' {
  if (values.length < 2) return 'stable';

  // Simple linear regression slope
  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * (values[i] || 0), 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const avg = calculateAverage(values);

  // Normalize slope as percentage of average
  const normalizedSlope = avg > 0 ? (slope / avg) * 100 : 0;

  if (normalizedSlope > 5) return 'increasing';
  if (normalizedSlope < -5) return 'decreasing';
  return 'stable';
}

function groupByCategoryAndMonth(
  transactions: Transaction[],
  categories: Category[]
): Map<string, { categoryName: string; monthlyAmounts: Map<string, number> }> {
  const result = new Map<string, { categoryName: string; monthlyAmounts: Map<string, number> }>();

  // Initialize with all expense categories
  categories
    .filter(c => c.type === 'expense')
    .forEach(c => {
      result.set(c.id, { categoryName: c.name, monthlyAmounts: new Map() });
    });

  // Group transactions
  transactions
    .filter(t => t.type === 'expense' && t.category_id)
    .forEach(t => {
      const categoryId = t.category_id!;
      const monthKey = t.date.substring(0, 7);

      if (!result.has(categoryId)) {
        const categoryName = t.category?.name || 'Sin categoría';
        result.set(categoryId, { categoryName, monthlyAmounts: new Map() });
      }

      const categoryData = result.get(categoryId)!;
      const currentAmount = categoryData.monthlyAmounts.get(monthKey) || 0;
      categoryData.monthlyAmounts.set(monthKey, currentAmount + Math.abs(t.amount));
    });

  return result;
}

function generateReasoning(
  avg: number,
  _stdDev: number,
  trend: string,
  confidence: string,
  _recommended: number
): string {
  const parts: string[] = [];

  parts.push(`Promedio histórico: €${avg.toFixed(2)}`);

  if (confidence === 'high') {
    parts.push('Gastos muy consistentes');
  } else if (confidence === 'medium') {
    parts.push('Variabilidad moderada');
  } else {
    parts.push('Alta variabilidad en gastos');
  }

  if (trend === 'increasing') {
    parts.push('Tendencia al alza');
  } else if (trend === 'decreasing') {
    parts.push('Tendencia a la baja');
  }

  return parts.join('. ') + '.';
}

export function calculateBudgetRecommendations(
  transactions: Transaction[],
  categories: Category[],
  existingBudgets: Budget[],
  _savingsGoalPercent: number = 20,
  monthsToAnalyze: number = 6
): BudgetRecommendation[] {
  // Filter to recent months only
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsToAnalyze);
  const cutoffStr = cutoffDate.toISOString().substring(0, 10);

  const recentTransactions = transactions.filter(t => t.date >= cutoffStr);

  if (recentTransactions.length < 10) {
    return []; // Not enough data
  }

  // Group by category and month
  const categoryMonthlyData = groupByCategoryAndMonth(recentTransactions, categories);

  const recommendations: BudgetRecommendation[] = [];

  categoryMonthlyData.forEach((data, categoryId) => {
    const monthlyAmounts = Array.from(data.monthlyAmounts.values());

    if (monthlyAmounts.length < 2) {
      return; // Skip categories with insufficient data
    }

    const avg = calculateAverage(monthlyAmounts);
    const stdDev = calculateStdDev(monthlyAmounts);
    const trend = calculateTrend(monthlyAmounts);

    // Skip categories with very low spending
    if (avg < 10) return;

    // Calculate coefficient of variation
    const cv = avg > 0 ? stdDev / avg : 0;

    let recommended: number;
    let confidence: 'high' | 'medium' | 'low';

    if (cv < 0.2) {
      // Very consistent spending
      recommended = avg * 1.1; // 10% buffer
      confidence = 'high';
    } else if (cv < 0.5) {
      // Moderate variability
      recommended = avg + (0.5 * stdDev);
      confidence = 'medium';
    } else {
      // High variability
      recommended = avg + stdDev;
      confidence = 'low';
    }

    // Adjust for trend
    if (trend === 'increasing') {
      recommended *= 1.05;
    } else if (trend === 'decreasing') {
      recommended *= 0.95;
    }

    // Find existing budget
    const existingBudget = existingBudgets.find(b => b.category_id === categoryId);

    // Round to nice numbers
    recommended = Math.ceil(recommended / 5) * 5;

    recommendations.push({
      categoryId,
      categoryName: data.categoryName,
      currentBudget: existingBudget?.amount || null,
      recommendedBudget: recommended,
      confidence,
      reasoning: generateReasoning(avg, stdDev, trend, confidence, recommended),
      historicalAvg: avg,
      historicalStdDev: stdDev,
      trend,
      monthlyData: monthlyAmounts,
    });
  });

  // Sort by amount (highest first)
  return recommendations.sort((a, b) => b.recommendedBudget - a.recommendedBudget);
}

export function getTotalRecommendedBudget(recommendations: BudgetRecommendation[]): number {
  return recommendations.reduce((sum, r) => sum + r.recommendedBudget, 0);
}

export function getBudgetDifference(recommendations: BudgetRecommendation[]): {
  category: string;
  current: number;
  recommended: number;
  difference: number;
}[] {
  return recommendations
    .filter(r => r.currentBudget !== null)
    .map(r => ({
      category: r.categoryName,
      current: r.currentBudget!,
      recommended: r.recommendedBudget,
      difference: r.recommendedBudget - r.currentBudget!,
    }))
    .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
}
