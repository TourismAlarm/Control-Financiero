'use client';

import { useState, useMemo } from 'react';
import { Shield, AlertTriangle, AlertCircle, Info, CheckCircle, Eye, EyeOff, RefreshCw, Trash2 } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { runAnomalyDetection, getAnomalySummary } from '@/lib/agents/anomalyDetection';

interface AnomalyDetectorProps {
  onDismissAnomaly?: (anomalyId: string) => void;
  onDeleteTransaction?: (transactionId: string) => void;
}

export function AnomalyDetector({ onDismissAnomaly, onDeleteTransaction }: AnomalyDetectorProps) {
  const { transactions, deleteTransaction } = useTransactions();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const anomalies = useMemo(() => {
    if (transactions.length < 10) return [];
    return runAnomalyDetection(transactions);
  }, [transactions]);

  const visibleAnomalies = useMemo(() => {
    if (showDismissed) return anomalies;
    return anomalies.filter(a => !dismissedIds.has(a.id));
  }, [anomalies, dismissedIds, showDismissed]);

  const summary = useMemo(() => getAnomalySummary(visibleAnomalies), [visibleAnomalies]);

  const handleDismiss = (anomalyId: string) => {
    setDismissedIds(prev => new Set([...prev, anomalyId]));
    onDismissAnomaly?.(anomalyId);
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta transacción?')) {
      try {
        deleteTransaction(transactionId);
        onDeleteTransaction?.(transactionId);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const runAnalysis = () => {
    setIsAnalyzing(true);
    // Simulate analysis delay for UX
    setTimeout(() => setIsAnalyzing(false), 500);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'medium': return <Info className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'high': return 'border-orange-300 bg-orange-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      default: return 'border-blue-300 bg-blue-50';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'duplicate': return 'Duplicado';
      case 'fraud_suspect': return 'Sospechoso';
      case 'unusual_amount': return 'Monto inusual';
      case 'unusual_timing': return 'Patrón temporal';
      case 'unusual_frequency': return 'Frecuencia inusual';
      default: return type;
    }
  };

  if (transactions.length < 10) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold">Detector de Anomalías</h3>
        </div>
        <div className="text-center py-8 text-gray-500">
          <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>Se necesitan al menos 10 transacciones para detectar anomalías</p>
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
          <Shield className="w-6 h-6 text-blue-500" />
          <h3 className="text-lg font-semibold">Detector de Anomalías</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title={showDismissed ? 'Ocultar descartados' : 'Mostrar descartados'}
          >
            {showDismissed ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Re-analizar"
          >
            <RefreshCw className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary.total > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {summary.critical > 0 && (
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.critical}</p>
              <p className="text-xs text-red-700">Crítico</p>
            </div>
          )}
          {summary.high > 0 && (
            <div className="bg-orange-50 rounded-lg p-2 text-center">
              <p className="text-2xl font-bold text-orange-600">{summary.high}</p>
              <p className="text-xs text-orange-700">Alto</p>
            </div>
          )}
          {summary.medium > 0 && (
            <div className="bg-yellow-50 rounded-lg p-2 text-center">
              <p className="text-2xl font-bold text-yellow-600">{summary.medium}</p>
              <p className="text-xs text-yellow-700">Medio</p>
            </div>
          )}
          {summary.low > 0 && (
            <div className="bg-blue-50 rounded-lg p-2 text-center">
              <p className="text-2xl font-bold text-blue-600">{summary.low}</p>
              <p className="text-xs text-blue-700">Bajo</p>
            </div>
          )}
        </div>
      )}

      {/* Anomalies List */}
      {visibleAnomalies.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
          <p className="text-green-700 font-medium">No se detectaron anomalías</p>
          <p className="text-sm text-gray-500 mt-1">Tus transacciones parecen normales</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleAnomalies.map((anomaly) => {
            const isExpanded = expandedId === anomaly.id;
            const isDismissed = dismissedIds.has(anomaly.id);

            return (
              <div
                key={anomaly.id}
                className={`border rounded-lg overflow-hidden transition-all ${getSeverityColor(anomaly.severity)} ${
                  isDismissed ? 'opacity-50' : ''
                }`}
              >
                {/* Anomaly Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : anomaly.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(anomaly.severity)}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{anomaly.title}</p>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                            {getTypeLabel(anomaly.type)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-sm font-medium text-gray-700">{anomaly.confidence}%</span>
                      <p className="text-xs text-gray-500">confianza</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-white/50">
                    <div className="pt-4 space-y-3">
                      {/* Transaction Details */}
                      {anomaly.details.transactions && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">Transacciones involucradas:</p>
                          <div className="space-y-1">
                            {anomaly.details.transactions.slice(0, 5).map((t: any, i: number) => (
                              <div key={i} className="flex justify-between text-sm bg-white rounded p-2">
                                <span className="text-gray-700">{t.description}</span>
                                <span className="font-medium">€{Math.abs(t.amount).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Additional Details */}
                      {anomaly.details.zScore && (
                        <div className="text-sm">
                          <span className="text-gray-500">Desviación: </span>
                          <span className="font-medium">{anomaly.details.zScore.toFixed(1)}σ del promedio</span>
                        </div>
                      )}

                      {anomaly.details.similarity && (
                        <div className="text-sm">
                          <span className="text-gray-500">Similitud: </span>
                          <span className="font-medium">{anomaly.details.similarity}%</span>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(anomaly.id);
                          }}
                          className="flex-1 py-2 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                        >
                          Ignorar
                        </button>
                        {anomaly.type === 'duplicate' && anomaly.transactionIds.length > 1 && anomaly.transactionIds[1] && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Delete the second duplicate
                              const duplicateId = anomaly.transactionIds[1];
                              if (duplicateId) {
                                handleDeleteTransaction(duplicateId);
                              }
                            }}
                            className="flex items-center gap-1 py-2 px-3 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Eliminar duplicado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dismissed count */}
      {dismissedIds.size > 0 && !showDismissed && (
        <p className="text-xs text-gray-500 text-center mt-4">
          {dismissedIds.size} anomalía(s) ignorada(s)
        </p>
      )}
    </div>
  );
}
