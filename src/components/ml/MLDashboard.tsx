'use client';

import React from 'react';
import { useMLCategorization } from '@/hooks/useMLCategorization';
import { Brain, RefreshCw, TrendingUp, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * ML Dashboard Component
 * Displays model statistics and allows manual training
 */
export function MLDashboard() {
  const { getStats, trainModel } = useMLCategorization();
  const { toast } = useToast();

  const { data: stats, isLoading: isLoadingStats, refetch } = getStats;

  const handleTrain = async () => {
    try {
      toast('Entrenando modelo ML...', 'info');
      const result = await trainModel.mutateAsync();
      toast(
        `Modelo entrenado exitosamente con ${result.stats.transactionsCount} transacciones`,
        'success'
      );
      refetch();
    } catch (error: any) {
      toast(`Error al entrenar: ${error.message}`, 'error');
    }
  };

  if (isLoadingStats) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 animate-pulse text-blue-600" />
          <span className="text-sm text-gray-600">Cargando estadísticas...</span>
        </div>
      </div>
    );
  }

  const hasEnoughData = stats && stats.transactionsCount > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Brain className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sistema de Categorización ML
            </h3>
            <p className="text-sm text-gray-600">
              Aprende de tus transacciones para mejorar las sugerencias
            </p>
          </div>
        </div>

        <button
          onClick={handleTrain}
          disabled={trainModel.isPending || !hasEnoughData}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${trainModel.isPending ? 'animate-spin' : ''}`}
          />
          {trainModel.isPending ? 'Entrenando...' : 'Entrenar Modelo'}
        </button>
      </div>

      {/* Statistics Grid */}
      {hasEnoughData ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Transactions Count */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Datos de Entrenamiento</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {stats.transactionsCount.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Transacciones categorizadas
            </p>
          </div>

          {/* Categories Count */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-medium">Categorías Activas</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {stats.categoriesCount}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Categorías disponibles
            </p>
          </div>

          {/* Status */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-600">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">Estado del Sistema</span>
            </div>
            <p className="mt-2 flex items-center gap-2 text-lg font-bold text-green-600">
              <span className="h-2 w-2 rounded-full bg-green-600"></span>
              Operativo
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Listo para sugerencias
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h4 className="mt-4 text-lg font-semibold text-gray-900">
            Sin datos de entrenamiento
          </h4>
          <p className="mt-2 text-sm text-gray-600">
            Añade transacciones con categorías para que el sistema aprenda tus
            patrones de gasto.
          </p>
          <div className="mt-4 rounded-lg bg-blue-50 p-4 text-left">
            <p className="text-sm font-medium text-blue-900">
              💡 Cómo funciona:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-800">
              <li>• Añade y categoriza al menos 10 transacciones</li>
              <li>• El sistema aprenderá de tus descripciones</li>
              <li>• Recibirás sugerencias automáticas al crear nuevas transacciones</li>
              <li>• La precisión mejora con más datos</li>
            </ul>
          </div>
        </div>
      )}

      {/* How it works */}
      {hasEnoughData && (
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h4 className="text-sm font-semibold text-blue-900">
            ¿Cómo funciona el sistema ML?
          </h4>
          <div className="mt-2 grid gap-3 text-sm text-blue-800 sm:grid-cols-2">
            <div className="flex gap-2">
              <span className="font-bold">1.</span>
              <span>Analiza descripciones de transacciones previas</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">2.</span>
              <span>Identifica patrones y palabras clave</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">3.</span>
              <span>Calcula similitudes con nuevas transacciones</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold">4.</span>
              <span>Sugiere categorías con nivel de confianza</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-700">
            El modelo se actualiza automáticamente cada vez que añades nuevas
            transacciones. También puedes re-entrenarlo manualmente usando el
            botón "Entrenar Modelo".
          </p>
        </div>
      )}

      {/* Training History - If available */}
      {trainModel.data && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-900">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              Último entrenamiento exitoso
            </span>
          </div>
          <div className="mt-2 grid gap-2 text-xs text-green-800 sm:grid-cols-3">
            <div>
              <span className="font-semibold">Transacciones:</span>{' '}
              {trainModel.data.stats.transactionsCount}
            </div>
            <div>
              <span className="font-semibold">Patrones:</span>{' '}
              {trainModel.data.stats.patternsCount}
            </div>
            <div>
              <span className="font-semibold">Tamaño:</span>{' '}
              {(trainModel.data.modelSize / 1024).toFixed(1)} KB
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
