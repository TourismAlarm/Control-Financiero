'use client';

import { useState, useMemo } from 'react';
import { Lightbulb, TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useBudgets } from '@/hooks/useBudgets';
import {
  calculateBudgetRecommendations,
  getTotalRecommendedBudget,
  type BudgetRecommendation
} from '@/lib/agents/budgetRecommendation';

interface BudgetRecommendationsProps {
  onApplyBudget?: (categoryId: string, amount: number) => void;
}

export function BudgetRecommendations({ onApplyBudget }: BudgetRecommendationsProps) {
  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { budgets, createBudget, updateBudget } = useBudgets();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());

  const recommendations = useMemo(() => {
    if (transactions.length < 10 || categories.length === 0) {
      return [];
    }

    return calculateBudgetRecommendations(
      transactions,
      categories,
      budgets,
      20, // 20% savings goal
      6   // 6 months of history
    );
  }, [transactions, categories, budgets]);

  const totalRecommended = useMemo(() => getTotalRecommendedBudget(recommendations), [recommendations]);

  const handleApply = async (rec: BudgetRecommendation) => {
    const existingBudget = budgets.find(b => b.category_id === rec.categoryId);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    try {
      if (existingBudget && existingBudget.id) {
        updateBudget({
          id: existingBudget.id,
          amount: rec.recommendedBudget,
        });
      } else {
        // user_id is added by the hook internally
        createBudget({
          category_id: rec.categoryId,
          amount: rec.recommendedBudget,
          month,
          year,
          alert_threshold: 80,
        } as Parameters<typeof createBudget>[0]);
      }

      setAppliedIds(prev => new Set([...prev, rec.categoryId]));
      onApplyBudget?.(rec.categoryId, rec.recommendedBudget);
    } catch (error) {
      console.error('Error applying budget:', error);
      alert('Error al aplicar el presupuesto');
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (transactions.length < 10) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold">Recomendaciones de Presupuesto</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Se necesitan al menos 10 transacciones para generar recomendaciones</p>
          <p className="text-sm mt-2">Tienes {transactions.length} transacciones registradas</p>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold">Recomendaciones de Presupuesto</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-300" />
          <p>No hay suficientes datos por categoría para generar recomendaciones</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold">Recomendaciones de Presupuesto</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Total recomendado</p>
          <p className="text-lg font-bold text-blue-600">{totalRecommended.toFixed(2)}€/mes</p>
        </div>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => {
          const isExpanded = expandedId === rec.categoryId;
          const isApplied = appliedIds.has(rec.categoryId);
          const hasDifference = rec.currentBudget !== null && rec.currentBudget !== rec.recommendedBudget;

          return (
            <div
              key={rec.categoryId}
              className={`border rounded-lg overflow-hidden transition-all ${
                isApplied ? 'border-green-300 bg-green-50' : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : rec.categoryId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getTrendIcon(rec.trend)}
                    <div>
                      <p className="font-medium text-gray-900">{rec.categoryName}</p>
                      <p className="text-sm text-gray-500">
                        {rec.currentBudget !== null
                          ? `Actual: €${rec.currentBudget.toFixed(2)}`
                          : 'Sin presupuesto'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-blue-600">€{rec.recommendedBudget.toFixed(2)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getConfidenceColor(rec.confidence)}`}>
                        {rec.confidence === 'high' ? 'Alta' : rec.confidence === 'medium' ? 'Media' : 'Baja'} confianza
                      </span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {hasDifference && !isExpanded && (
                  <div className="mt-2 text-xs">
                    {rec.recommendedBudget > rec.currentBudget! ? (
                      <span className="text-orange-600">↑ Aumentar €{(rec.recommendedBudget - rec.currentBudget!).toFixed(2)}</span>
                    ) : (
                      <span className="text-green-600">↓ Reducir €{(rec.currentBudget! - rec.recommendedBudget).toFixed(2)}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                  <div className="pt-4 space-y-3">
                    <p className="text-sm text-gray-600">{rec.reasoning}</p>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Promedio histórico</p>
                        <p className="font-medium">€{rec.historicalAvg.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Desviación estándar</p>
                        <p className="font-medium">€{rec.historicalStdDev.toFixed(2)}</p>
                      </div>
                    </div>

                    {rec.monthlyData.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Últimos {rec.monthlyData.length} meses</p>
                        <div className="flex items-end gap-1 h-12">
                          {rec.monthlyData.map((amount, i) => {
                            const maxAmount = Math.max(...rec.monthlyData);
                            const height = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                            return (
                              <div
                                key={i}
                                className="flex-1 bg-blue-400 rounded-t"
                                style={{ height: `${height}%`, minHeight: '4px' }}
                                title={`€${amount.toFixed(2)}`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApply(rec);
                      }}
                      disabled={isApplied}
                      className={`w-full py-2 rounded-lg font-medium transition-colors ${
                        isApplied
                          ? 'bg-green-100 text-green-700 cursor-default'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {isApplied ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircle className="w-4 h-4" /> Aplicado
                        </span>
                      ) : (
                        rec.currentBudget !== null ? 'Actualizar presupuesto' : 'Crear presupuesto'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
