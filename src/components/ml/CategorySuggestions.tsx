'use client';

import React from 'react';
import { CategorySuggestion } from '@/lib/ml/categorization';
import { Sparkles, TrendingUp, Hash, Zap } from 'lucide-react';

interface CategorySuggestionsProps {
  suggestions: CategorySuggestion[];
  onSelect: (categoryId: string) => void;
  selectedCategoryId?: string;
  isLoading?: boolean;
}

/**
 * Component to display ML-based category suggestions
 * Shows confidence levels and reasoning for each suggestion
 */
export function CategorySuggestions({
  suggestions,
  onSelect,
  selectedCategoryId,
  isLoading = false,
}: CategorySuggestionsProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Analizando descripción...</span>
        </div>
      </div>
    );
  }

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const getReasonIcon = (reason: CategorySuggestion['reason']) => {
    switch (reason) {
      case 'exact_match':
        return <Zap className="h-3.5 w-3.5" />;
      case 'similar_match':
        return <TrendingUp className="h-3.5 w-3.5" />;
      case 'keyword_match':
        return <Hash className="h-3.5 w-3.5" />;
      case 'pattern_match':
        return <Sparkles className="h-3.5 w-3.5" />;
    }
  };

  const getReasonLabel = (reason: CategorySuggestion['reason']) => {
    switch (reason) {
      case 'exact_match':
        return 'Coincidencia exacta';
      case 'similar_match':
        return 'Coincidencia similar';
      case 'keyword_match':
        return 'Palabras clave';
      case 'pattern_match':
        return 'Patrón detectado';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-700 bg-green-100 border-green-200';
    if (confidence >= 0.6) return 'text-blue-700 bg-blue-100 border-blue-200';
    return 'text-gray-700 bg-gray-100 border-gray-200';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return 'Muy alta';
    if (confidence >= 0.8) return 'Alta';
    if (confidence >= 0.6) return 'Media';
    return 'Baja';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Sparkles className="h-4 w-4 text-blue-600" />
        <span>Sugerencias de categorías (ML)</span>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => {
          const isSelected = selectedCategoryId === suggestion.categoryId;
          const confidencePercent = Math.round(suggestion.confidence * 100);

          return (
            <button
              key={suggestion.categoryId}
              type="button"
              onClick={() => onSelect(suggestion.categoryId)}
              className={`w-full rounded-lg border p-3 text-left transition-all hover:shadow-md ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {suggestion.categoryName}
                    </span>
                    {index === 0 && suggestion.confidence >= 0.8 && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                        Recomendada
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                    <span className="flex items-center gap-1">
                      {getReasonIcon(suggestion.reason)}
                      {getReasonLabel(suggestion.reason)}
                    </span>
                    {suggestion.matchedPattern && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-700">
                        {suggestion.matchedPattern.length > 30
                          ? suggestion.matchedPattern.substring(0, 30) + '...'
                          : suggestion.matchedPattern}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`rounded-full border px-2 py-1 text-xs font-semibold ${getConfidenceColor(
                      suggestion.confidence
                    )}`}
                  >
                    {confidencePercent}%
                  </span>
                  <span className="text-xs text-gray-500">
                    {getConfidenceLabel(suggestion.confidence)}
                  </span>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    suggestion.confidence >= 0.8
                      ? 'bg-green-500'
                      : suggestion.confidence >= 0.6
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        💡 El sistema aprende de tus transacciones previas para mejorar las sugerencias
      </p>
    </div>
  );
}
