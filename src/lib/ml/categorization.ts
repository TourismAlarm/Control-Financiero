/**
 * ML-based Expense Categorization System
 *
 * This module implements an intelligent categorization system that learns from user behavior.
 * It uses multiple strategies:
 * 1. Historical pattern matching - Learns from past transactions
 * 2. Keyword-based rules - Uses predefined and custom rules
 * 3. Similarity scoring - Finds similar descriptions
 * 4. Confidence scoring - Provides probability estimates
 */

import { TransactionInsert } from '@/types/database';

export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0-1 scale
  reason: 'exact_match' | 'similar_match' | 'keyword_match' | 'pattern_match';
  matchedPattern?: string;
}

export interface TrainingData {
  description: string;
  categoryId: string;
  amount?: number;
  keywords: string[];
}

export interface MLModel {
  version: string;
  trainingData: TrainingData[];
  patterns: Map<string, CategoryPattern>;
  lastTrained: Date;
}

interface CategoryPattern {
  categoryId: string;
  keywords: Set<string>;
  descriptions: string[];
  frequency: number;
  averageAmount?: number;
}

/**
 * ML Categorization Engine
 */
export class CategorizationEngine {
  private model: MLModel;
  private categories: Array<{ id: string; name: string; type: 'income' | 'expense' }>;

  constructor(
    categories: Array<{ id: string; name: string; type: 'income' | 'expense' }>,
    existingModel?: MLModel
  ) {
    this.categories = categories;
    this.model = existingModel || {
      version: '1.0.0',
      trainingData: [],
      patterns: new Map(),
      lastTrained: new Date(),
    };
  }

  /**
   * Train the model with historical transactions
   */
  train(transactions: Array<{ description: string; category_id: string; amount: number }>): void {
    const patterns = new Map<string, CategoryPattern>();

    transactions.forEach(transaction => {
      if (!transaction.category_id) return;

      const keywords = this.extractKeywords(transaction.description);
      const existing = patterns.get(transaction.category_id);

      if (existing) {
        existing.keywords = new Set([...existing.keywords, ...keywords]);
        existing.descriptions.push(transaction.description.toLowerCase());
        existing.frequency++;
        if (existing.averageAmount && transaction.amount) {
          existing.averageAmount = (existing.averageAmount + transaction.amount) / 2;
        }
      } else {
        patterns.set(transaction.category_id, {
          categoryId: transaction.category_id,
          keywords: new Set(keywords),
          descriptions: [transaction.description.toLowerCase()],
          frequency: 1,
          averageAmount: transaction.amount,
        });
      }

      // Add to training data
      this.model.trainingData.push({
        description: transaction.description,
        categoryId: transaction.category_id,
        amount: transaction.amount,
        keywords,
      });
    });

    this.model.patterns = patterns;
    this.model.lastTrained = new Date();
  }

  /**
   * Suggest categories for a new transaction description
   */
  suggest(description: string, amount?: number, type?: 'income' | 'expense'): CategorySuggestion[] {
    const suggestions: CategorySuggestion[] = [];
    const normalizedDesc = description.toLowerCase().trim();
    const keywords = this.extractKeywords(description);

    // Filter categories by type if provided
    const relevantCategories = type
      ? this.categories.filter(cat => cat.type === type)
      : this.categories;

    // Strategy 1: Exact match from training data
    const exactMatch = this.findExactMatch(normalizedDesc);
    if (exactMatch) {
      const category = relevantCategories.find(c => c.id === exactMatch.categoryId);
      if (category) {
        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.95,
          reason: 'exact_match',
          matchedPattern: exactMatch.description,
        });
      }
    }

    // Strategy 2: Similarity matching
    const similarMatches = this.findSimilarMatches(normalizedDesc, keywords);
    similarMatches.forEach(match => {
      const category = relevantCategories.find(c => c.id === match.categoryId);
      if (category && !suggestions.find(s => s.categoryId === category.id)) {
        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: match.confidence,
          reason: 'similar_match',
          matchedPattern: match.matchedDescription,
        });
      }
    });

    // Strategy 3: Keyword matching from patterns
    const keywordMatches = this.findKeywordMatches(keywords);
    keywordMatches.forEach(match => {
      const category = relevantCategories.find(c => c.id === match.categoryId);
      if (category && !suggestions.find(s => s.categoryId === category.id)) {
        suggestions.push({
          categoryId: category.id,
          categoryName: category.name,
          confidence: match.confidence,
          reason: 'keyword_match',
          matchedPattern: match.keyword,
        });
      }
    });

    // Strategy 4: Amount-based hints (if similar amounts exist for a category)
    if (amount) {
      const amountMatches = this.findAmountPatterns(amount);
      amountMatches.forEach(match => {
        const category = relevantCategories.find(c => c.id === match.categoryId);
        if (category && !suggestions.find(s => s.categoryId === category.id)) {
          suggestions.push({
            categoryId: category.id,
            categoryName: category.name,
            confidence: match.confidence,
            reason: 'pattern_match',
            matchedPattern: `Similar amount pattern`,
          });
        }
      });
    }

    // Sort by confidence and return top 3
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);
  }

  /**
   * Find exact match in training data
   */
  private findExactMatch(description: string): { categoryId: string; description: string } | null {
    for (const data of this.model.trainingData) {
      if (data.description.toLowerCase() === description) {
        return {
          categoryId: data.categoryId,
          description: data.description,
        };
      }
    }
    return null;
  }

  /**
   * Find similar matches using text similarity
   */
  private findSimilarMatches(
    description: string,
    keywords: string[]
  ): Array<{ categoryId: string; confidence: number; matchedDescription: string }> {
    const matches: Array<{ categoryId: string; confidence: number; matchedDescription: string }> = [];

    this.model.patterns.forEach((pattern, categoryId) => {
      pattern.descriptions.forEach(trainedDesc => {
        const similarity = this.calculateSimilarity(description, trainedDesc, keywords);
        if (similarity > 0.5) {
          matches.push({
            categoryId,
            confidence: similarity * 0.9, // Scale down slightly from exact match
            matchedDescription: trainedDesc,
          });
        }
      });
    });

    return matches;
  }

  /**
   * Find matches based on keyword overlap
   */
  private findKeywordMatches(
    keywords: string[]
  ): Array<{ categoryId: string; confidence: number; keyword: string }> {
    const matches: Array<{ categoryId: string; confidence: number; keyword: string }> = [];

    this.model.patterns.forEach((pattern, categoryId) => {
      const commonKeywords = keywords.filter(kw => pattern.keywords.has(kw));
      if (commonKeywords.length > 0) {
        const confidence = Math.min(
          0.85,
          (commonKeywords.length / Math.max(keywords.length, 1)) * 0.7 +
          (pattern.frequency / Math.max(...Array.from(this.model.patterns.values()).map(p => p.frequency))) * 0.15
        );

        matches.push({
          categoryId,
          confidence,
          keyword: commonKeywords.join(', '),
        });
      }
    });

    return matches;
  }

  /**
   * Find patterns based on transaction amount
   */
  private findAmountPatterns(
    amount: number
  ): Array<{ categoryId: string; confidence: number }> {
    const matches: Array<{ categoryId: string; confidence: number }> = [];

    this.model.patterns.forEach((pattern, categoryId) => {
      if (pattern.averageAmount) {
        const difference = Math.abs(pattern.averageAmount - amount);
        const percentDiff = difference / pattern.averageAmount;

        // If within 20% of average amount, consider it a match
        if (percentDiff <= 0.2) {
          const confidence = 0.4 * (1 - percentDiff / 0.2); // Max 0.4 confidence for amount matching
          matches.push({ categoryId, confidence });
        }
      }
    });

    return matches;
  }

  /**
   * Calculate text similarity using multiple techniques
   */
  private calculateSimilarity(text1: string, text2: string, keywords1: string[]): number {
    // Exact match
    if (text1 === text2) return 1.0;

    // Contains match
    if (text1.includes(text2) || text2.includes(text1)) return 0.85;

    // Keyword overlap
    const keywords2 = this.extractKeywords(text2);
    const commonKeywords = keywords1.filter(kw => keywords2.includes(kw));
    const keywordSimilarity = commonKeywords.length / Math.max(keywords1.length, keywords2.length, 1);

    // Levenshtein distance (simplified)
    const tokens1 = text1.split(/\s+/);
    const tokens2 = text2.split(/\s+/);
    const commonTokens = tokens1.filter(t => tokens2.includes(t));
    const tokenSimilarity = (2 * commonTokens.length) / (tokens1.length + tokens2.length);

    return Math.max(keywordSimilarity * 0.7 + tokenSimilarity * 0.3, 0);
  }

  /**
   * Extract meaningful keywords from description
   */
  private extractKeywords(description: string): string[] {
    const stopWords = new Set([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'de', 'del', 'a', 'al', 'en', 'por', 'para', 'con', 'sin',
      'sobre', 'entre', 'y', 'o', 'pero', 'si', 'no', 'que',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at',
      'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was',
    ]);

    return description
      .toLowerCase()
      .replace(/[^\w\sáéíóúñü]/g, ' ') // Keep Spanish characters
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .filter(word => !/^\d+$/.test(word)); // Remove pure numbers
  }

  /**
   * Export model for storage
   */
  exportModel(): string {
    return JSON.stringify({
      version: this.model.version,
      trainingData: this.model.trainingData,
      patterns: Array.from(this.model.patterns.entries()).map(([id, pattern]) => ({
        id,
        categoryId: pattern.categoryId,
        keywords: Array.from(pattern.keywords),
        descriptions: pattern.descriptions,
        frequency: pattern.frequency,
        averageAmount: pattern.averageAmount,
      })),
      lastTrained: this.model.lastTrained.toISOString(),
    });
  }

  /**
   * Import model from storage
   */
  static importModel(data: string): MLModel {
    const parsed = JSON.parse(data);
    const patterns = new Map<string, CategoryPattern>();

    parsed.patterns.forEach((p: any) => {
      patterns.set(p.id, {
        categoryId: p.categoryId,
        keywords: new Set(p.keywords),
        descriptions: p.descriptions,
        frequency: p.frequency,
        averageAmount: p.averageAmount,
      });
    });

    return {
      version: parsed.version,
      trainingData: parsed.trainingData,
      patterns,
      lastTrained: new Date(parsed.lastTrained),
    };
  }

  /**
   * Get model statistics
   */
  getStats() {
    return {
      version: this.model.version,
      trainingDataSize: this.model.trainingData.length,
      patternsCount: this.model.patterns.size,
      lastTrained: this.model.lastTrained,
      categoriesTracked: Array.from(this.model.patterns.keys()),
    };
  }
}
