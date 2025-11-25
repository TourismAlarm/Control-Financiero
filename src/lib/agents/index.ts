/**
 * Intelligent Agents - Central Export
 *
 * This module exports all intelligent agents for the financial control application.
 * Each agent provides specialized analysis and recommendations.
 */

// Budget Recommendation Agent
export {
  calculateBudgetRecommendations,
  getTotalRecommendedBudget,
  getBudgetDifference,
  type BudgetRecommendation,
} from './budgetRecommendation';

// Anomaly Detection Agent
export {
  runAnomalyDetection,
  getAnomalySummary,
  type Anomaly,
} from './anomalyDetection';

// Smart Notifications Agent
export {
  generateSmartNotifications,
  getNotificationSummary,
  filterNotificationsByType,
  type SmartNotification,
} from './smartNotifications';
