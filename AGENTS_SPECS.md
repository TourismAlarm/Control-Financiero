# Especificaciones Técnicas de Agentes - Control Financiero

Este documento contiene las especificaciones técnicas detalladas para los agentes planificados.

---

## Agente 1: Budget Recommendation Agent

### Objetivo
Sugerir presupuestos realistas basados en el historial de gastos del usuario.

### Ubicación
```
src/components/agents/BudgetRecommendation.tsx
src/lib/agents/budgetRecommendation.ts
```

### Interface

```typescript
interface BudgetRecommendation {
  categoryId: string;
  categoryName: string;
  currentBudget: number | null;
  recommendedBudget: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  historicalAvg: number;
  historicalStdDev: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface BudgetRecommendationProps {
  transactions: Transaction[];
  existingBudgets: Budget[];
  savingsGoal?: number; // % de ahorro objetivo
  monthsToAnalyze?: number; // default 6
}
```

### Algoritmo

```typescript
function calculateRecommendations(
  transactions: Transaction[],
  savingsGoalPercent: number = 20
): BudgetRecommendation[] {

  // 1. Agrupar gastos por categoría y mes
  const categoryMonthlyData = groupByCategoryAndMonth(transactions);

  // 2. Para cada categoría, calcular estadísticas
  const recommendations = Object.entries(categoryMonthlyData).map(([categoryId, monthlyAmounts]) => {
    const avg = calculateAverage(monthlyAmounts);
    const stdDev = calculateStdDev(monthlyAmounts);
    const trend = calculateTrend(monthlyAmounts);

    // 3. Calcular presupuesto recomendado
    let recommended: number;
    let confidence: 'high' | 'medium' | 'low';

    // Si hay poca variabilidad, alta confianza
    const coefficientOfVariation = stdDev / avg;

    if (coefficientOfVariation < 0.2) {
      // Gastos muy consistentes
      recommended = avg * 1.1; // 10% buffer
      confidence = 'high';
    } else if (coefficientOfVariation < 0.5) {
      // Variabilidad moderada
      recommended = avg + (0.5 * stdDev);
      confidence = 'medium';
    } else {
      // Alta variabilidad
      recommended = avg + stdDev;
      confidence = 'low';
    }

    // 4. Ajustar según objetivo de ahorro
    if (savingsGoalPercent > 0) {
      const totalIncome = calculateTotalIncome(transactions);
      const maxBudget = (totalIncome * (1 - savingsGoalPercent / 100)) / categoryCount;
      recommended = Math.min(recommended, maxBudget);
    }

    // 5. Ajustar según tendencia
    if (trend === 'increasing') {
      recommended *= 1.05; // Anticipar incremento
    } else if (trend === 'decreasing') {
      recommended *= 0.95; // Aprovechar reducción
    }

    return {
      categoryId,
      recommendedBudget: Math.round(recommended * 100) / 100,
      confidence,
      historicalAvg: avg,
      historicalStdDev: stdDev,
      trend,
      reasoning: generateReasoning(avg, stdDev, trend, confidence)
    };
  });

  return recommendations;
}
```

### Fórmulas Matemáticas

```
Promedio (μ):
μ = Σxi / n

Desviación Estándar (σ):
σ = √(Σ(xi - μ)² / n)

Coeficiente de Variación (CV):
CV = σ / μ

Tendencia (regresión lineal):
slope = (n×Σxy - Σx×Σy) / (n×Σx² - (Σx)²)
trend = slope > 0.05 ? 'increasing' : slope < -0.05 ? 'decreasing' : 'stable'

Presupuesto Recomendado:
- CV < 0.2: budget = μ × 1.1
- CV < 0.5: budget = μ + 0.5σ
- CV ≥ 0.5: budget = μ + σ
```

### UI Component

```tsx
export function BudgetRecommendation({ transactions, existingBudgets }: Props) {
  const recommendations = useMemo(
    () => calculateRecommendations(transactions),
    [transactions]
  );

  return (
    <div className="space-y-4">
      <h3>Presupuestos Recomendados</h3>
      {recommendations.map(rec => (
        <RecommendationCard
          key={rec.categoryId}
          recommendation={rec}
          currentBudget={existingBudgets.find(b => b.category_id === rec.categoryId)}
          onApply={(budget) => applyBudget(rec.categoryId, budget)}
        />
      ))}
    </div>
  );
}
```

### Requisitos
- Mínimo 3 meses de datos históricos
- Al menos 5 transacciones por categoría

---

## Agente 2: Advanced Anomaly Detection Agent

### Objetivo
Detectar fraudes, transacciones duplicadas y comportamientos sospechosos.

### Ubicación
```
src/components/agents/AnomalyDetection.tsx
src/lib/agents/anomalyDetection.ts
```

### Interface

```typescript
interface Anomaly {
  id: string;
  type: 'duplicate' | 'fraud_suspect' | 'unusual_amount' | 'unusual_timing' | 'unusual_frequency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  transactionIds: string[];
  description: string;
  confidence: number; // 0-100
  suggestedAction: 'review' | 'delete' | 'flag' | 'ignore';
  details: Record<string, any>;
}

interface AnomalyDetectionConfig {
  enableDuplicateDetection: boolean;
  enableFraudDetection: boolean;
  enableTimingAnalysis: boolean;
  duplicateThreshold: number; // días para considerar duplicado
  amountDeviationThreshold: number; // multiplicador de σ
}
```

### Algoritmos

#### 2.1 Detección de Duplicados

```typescript
function detectDuplicates(transactions: Transaction[]): Anomaly[] {
  const duplicates: Anomaly[] = [];
  const seen = new Map<string, Transaction[]>();

  transactions.forEach(t => {
    // Crear key de similitud
    const key = `${Math.round(t.amount)}_${t.description.toLowerCase().substring(0, 20)}`;

    if (seen.has(key)) {
      const existing = seen.get(key)!;

      // Verificar si están dentro de ventana de tiempo
      const isWithinWindow = existing.some(e => {
        const daysDiff = Math.abs(
          (new Date(t.date).getTime() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24)
        );
        return daysDiff <= 7; // 7 días de ventana
      });

      if (isWithinWindow) {
        // Calcular similitud de descripción con Levenshtein
        const similarity = calculateSimilarity(t.description, existing[0].description);

        if (similarity > 0.8) {
          duplicates.push({
            id: crypto.randomUUID(),
            type: 'duplicate',
            severity: similarity > 0.95 ? 'high' : 'medium',
            transactionIds: [t.id, ...existing.map(e => e.id)],
            description: `Posible transacción duplicada: "${t.description}"`,
            confidence: Math.round(similarity * 100),
            suggestedAction: similarity > 0.95 ? 'delete' : 'review',
            details: {
              amount: t.amount,
              dates: [t.date, ...existing.map(e => e.date)],
              similarity
            }
          });
        }
      }

      existing.push(t);
    } else {
      seen.set(key, [t]);
    }
  });

  return duplicates;
}
```

#### 2.2 Detección de Fraude (Isolation Forest simplificado)

```typescript
function detectFraudSuspects(transactions: Transaction[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Calcular features para cada transacción
  const features = transactions.map(t => ({
    transaction: t,
    amount: t.amount,
    hourOfDay: new Date(t.date).getHours(),
    dayOfWeek: new Date(t.date).getDay(),
    isWeekend: [0, 6].includes(new Date(t.date).getDay()),
  }));

  // Calcular estadísticas
  const amountStats = calculateStats(features.map(f => f.amount));
  const hourStats = calculateStats(features.map(f => f.hourOfDay));

  features.forEach(f => {
    let anomalyScore = 0;
    const reasons: string[] = [];

    // 1. Monto inusual (Z-score > 3)
    const amountZScore = (f.amount - amountStats.mean) / amountStats.stdDev;
    if (Math.abs(amountZScore) > 3) {
      anomalyScore += 40;
      reasons.push(`Monto ${amountZScore > 0 ? 'muy alto' : 'muy bajo'} (${amountZScore.toFixed(1)}σ)`);
    }

    // 2. Hora inusual (fuera de 8am-10pm)
    if (f.hourOfDay < 8 || f.hourOfDay > 22) {
      anomalyScore += 20;
      reasons.push(`Hora inusual: ${f.hourOfDay}:00`);
    }

    // 3. Transacciones en fin de semana para categorías laborales
    // (implementar lógica específica por categoría)

    // 4. Frecuencia inusual (múltiples en mismo día)
    const sameDay = transactions.filter(t =>
      t.date === f.transaction.date && t.id !== f.transaction.id
    );
    if (sameDay.length > 5) {
      anomalyScore += 30;
      reasons.push(`${sameDay.length + 1} transacciones en el mismo día`);
    }

    if (anomalyScore >= 50) {
      anomalies.push({
        id: crypto.randomUUID(),
        type: 'fraud_suspect',
        severity: anomalyScore >= 80 ? 'critical' : anomalyScore >= 60 ? 'high' : 'medium',
        transactionIds: [f.transaction.id],
        description: `Transacción sospechosa: ${reasons.join(', ')}`,
        confidence: Math.min(anomalyScore, 100),
        suggestedAction: anomalyScore >= 80 ? 'review' : 'flag',
        details: {
          amount: f.amount,
          zScore: amountZScore,
          reasons
        }
      });
    }
  });

  return anomalies;
}
```

#### 2.3 Análisis de Frecuencia

```typescript
function detectFrequencyAnomalies(transactions: Transaction[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Agrupar por descripción normalizada
  const groups = groupByNormalizedDescription(transactions);

  groups.forEach((txns, description) => {
    if (txns.length < 3) return;

    // Calcular intervalos entre transacciones
    const intervals = calculateIntervals(txns);
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdDevInterval = calculateStdDev(intervals);

    // Si el último intervalo es muy diferente al promedio
    const lastInterval = intervals[intervals.length - 1];
    if (lastInterval && Math.abs(lastInterval - avgInterval) > 2 * stdDevInterval) {
      anomalies.push({
        id: crypto.randomUUID(),
        type: 'unusual_frequency',
        severity: 'low',
        transactionIds: txns.map(t => t.id),
        description: `Cambio en frecuencia de "${description}"`,
        confidence: 70,
        suggestedAction: 'review',
        details: {
          expectedInterval: avgInterval,
          actualInterval: lastInterval,
          pattern: txns.length >= 3 ? 'recurring' : 'sporadic'
        }
      });
    }
  });

  return anomalies;
}
```

### UI Component

```tsx
export function AnomalyDetection({ transactions }: Props) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const runAnalysis = async () => {
    setIsAnalyzing(true);

    const results = [
      ...detectDuplicates(transactions),
      ...detectFraudSuspects(transactions),
      ...detectFrequencyAnomalies(transactions)
    ];

    // Ordenar por severidad
    results.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.severity] - order[b.severity];
    });

    setAnomalies(results);
    setIsAnalyzing(false);
  };

  return (
    <div>
      <button onClick={runAnalysis} disabled={isAnalyzing}>
        {isAnalyzing ? 'Analizando...' : 'Ejecutar Análisis'}
      </button>

      <AnomalyList
        anomalies={anomalies}
        onDismiss={(id) => dismissAnomaly(id)}
        onAction={(id, action) => handleAction(id, action)}
      />
    </div>
  );
}
```

---

## Agente 3: Spending Behavior Agent

### Objetivo
Analizar patrones de comportamiento de gasto y detectar cambios de hábitos.

### Ubicación
```
src/components/agents/SpendingBehavior.tsx
src/lib/agents/spendingBehavior.ts
```

### Interface

```typescript
interface BehaviorInsight {
  id: string;
  type: 'habit_change' | 'spending_trigger' | 'category_shift' | 'seasonal_pattern';
  title: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  magnitude: number; // 0-100
  period: {
    start: string;
    end: string;
  };
  recommendations: string[];
  data: Record<string, any>;
}

interface SpendingProfile {
  weekdayPattern: number[]; // [lun, mar, mié, jue, vie, sab, dom]
  categoryPreferences: Record<string, number>; // % por categoría
  avgTransactionSize: number;
  transactionsPerWeek: number;
  peakSpendingHours: number[];
  seasonalFactors: Record<string, number>; // mes -> factor
}
```

### Algoritmos

#### 3.1 Detección de Cambio de Hábitos

```typescript
function detectHabitChanges(
  transactions: Transaction[],
  windowSize: number = 30 // días
): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];

  // Dividir en periodos
  const currentPeriod = transactions.filter(t =>
    isWithinDays(t.date, windowSize)
  );
  const previousPeriod = transactions.filter(t =>
    isWithinDays(t.date, windowSize * 2) && !isWithinDays(t.date, windowSize)
  );

  // Comparar perfiles
  const currentProfile = buildProfile(currentPeriod);
  const previousProfile = buildProfile(previousPeriod);

  // 1. Cambio en patrón semanal
  const weekdayChange = calculateVectorDistance(
    currentProfile.weekdayPattern,
    previousProfile.weekdayPattern
  );

  if (weekdayChange > 0.3) {
    const peakDayOld = previousProfile.weekdayPattern.indexOf(
      Math.max(...previousProfile.weekdayPattern)
    );
    const peakDayNew = currentProfile.weekdayPattern.indexOf(
      Math.max(...currentProfile.weekdayPattern)
    );

    insights.push({
      id: crypto.randomUUID(),
      type: 'habit_change',
      title: 'Cambio en Patrón Semanal',
      description: `Tu día de mayor gasto cambió de ${DAYS[peakDayOld]} a ${DAYS[peakDayNew]}`,
      impact: 'neutral',
      magnitude: Math.round(weekdayChange * 100),
      period: { start: getStartDate(windowSize * 2), end: new Date().toISOString() },
      recommendations: [
        'Revisa si este cambio es intencional',
        'Considera ajustar tus presupuestos semanales'
      ],
      data: { currentProfile, previousProfile, weekdayChange }
    });
  }

  // 2. Cambio en preferencias de categoría
  Object.entries(currentProfile.categoryPreferences).forEach(([category, currentPct]) => {
    const previousPct = previousProfile.categoryPreferences[category] || 0;
    const change = currentPct - previousPct;

    if (Math.abs(change) > 10) { // Más de 10% de cambio
      insights.push({
        id: crypto.randomUUID(),
        type: 'category_shift',
        title: `${change > 0 ? 'Aumento' : 'Reducción'} en ${category}`,
        description: `Los gastos en ${category} ${change > 0 ? 'aumentaron' : 'disminuyeron'} un ${Math.abs(change).toFixed(0)}%`,
        impact: change > 0 ? 'negative' : 'positive',
        magnitude: Math.abs(change),
        period: { start: getStartDate(windowSize), end: new Date().toISOString() },
        recommendations: change > 0
          ? [`Considera establecer un presupuesto para ${category}`]
          : [`Excelente reducción en ${category}`],
        data: { category, previousPct, currentPct, change }
      });
    }
  });

  // 3. Cambio en tamaño promedio de transacción
  const sizeChange = (currentProfile.avgTransactionSize - previousProfile.avgTransactionSize)
    / previousProfile.avgTransactionSize * 100;

  if (Math.abs(sizeChange) > 20) {
    insights.push({
      id: crypto.randomUUID(),
      type: 'habit_change',
      title: 'Cambio en Tamaño de Compras',
      description: `El monto promedio por transacción ${sizeChange > 0 ? 'aumentó' : 'disminuyó'} un ${Math.abs(sizeChange).toFixed(0)}%`,
      impact: sizeChange > 0 ? 'negative' : 'positive',
      magnitude: Math.abs(sizeChange),
      period: { start: getStartDate(windowSize), end: new Date().toISOString() },
      recommendations: sizeChange > 0
        ? ['Considera hacer compras más pequeñas y frecuentes']
        : ['Buen trabajo controlando el tamaño de tus compras'],
      data: {
        previousAvg: previousProfile.avgTransactionSize,
        currentAvg: currentProfile.avgTransactionSize
      }
    });
  }

  return insights;
}
```

#### 3.2 Detección de Triggers de Gasto

```typescript
function detectSpendingTriggers(transactions: Transaction[]): BehaviorInsight[] {
  const insights: BehaviorInsight[] = [];

  // Analizar correlaciones temporales
  const spendingByContext = {
    afterPayday: [] as number[],
    weekends: [] as number[],
    endOfMonth: [] as number[],
    holidays: [] as number[],
  };

  transactions.forEach(t => {
    const date = new Date(t.date);
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();

    // Después del día de pago (asumiendo día 1 o configurable)
    if (dayOfMonth >= 1 && dayOfMonth <= 5) {
      spendingByContext.afterPayday.push(Math.abs(t.amount));
    }

    // Fin de semana
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      spendingByContext.weekends.push(Math.abs(t.amount));
    }

    // Final de mes
    if (dayOfMonth >= 25) {
      spendingByContext.endOfMonth.push(Math.abs(t.amount));
    }
  });

  // Comparar con promedio general
  const avgAll = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0) / transactions.length;

  Object.entries(spendingByContext).forEach(([context, amounts]) => {
    if (amounts.length < 5) return;

    const avgContext = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const ratio = avgContext / avgAll;

    if (ratio > 1.5) {
      insights.push({
        id: crypto.randomUUID(),
        type: 'spending_trigger',
        title: `Trigger: ${CONTEXT_NAMES[context]}`,
        description: `Gastas un ${((ratio - 1) * 100).toFixed(0)}% más ${CONTEXT_DESCRIPTIONS[context]}`,
        impact: 'negative',
        magnitude: Math.round((ratio - 1) * 100),
        period: { start: '', end: '' },
        recommendations: CONTEXT_RECOMMENDATIONS[context],
        data: { context, avgContext, avgAll, ratio }
      });
    }
  });

  return insights;
}
```

---

## Agente 4: Financial Planning Agent

### Objetivo
Optimizar estrategias de pago de deudas y planificación financiera a largo plazo.

### Ubicación
```
src/components/agents/FinancialPlanning.tsx
src/lib/agents/financialPlanning.ts
```

### Interface

```typescript
interface DebtPayoffStrategy {
  name: 'avalanche' | 'snowball' | 'hybrid';
  loans: LoanPayoffPlan[];
  totalInterestPaid: number;
  totalMonths: number;
  monthlyPayment: number;
  freedomDate: Date;
}

interface LoanPayoffPlan {
  loanId: string;
  loanName: string;
  payoffOrder: number;
  payoffDate: Date;
  totalPaid: number;
  interestPaid: number;
  monthlyPayments: MonthlyPayment[];
}

interface FinancialScenario {
  name: string;
  description: string;
  assumptions: Record<string, number>;
  projectedOutcome: {
    netWorth: number[];
    savingsGoalCompletion: Date[];
    debtFreeDate: Date;
  };
}
```

### Algoritmos

#### 4.1 Estrategia Avalanche (Minimizar Intereses)

```typescript
function calculateAvalancheStrategy(
  loans: Loan[],
  extraPayment: number = 0
): DebtPayoffStrategy {
  // Ordenar por tasa de interés (mayor primero)
  const sortedLoans = [...loans].sort((a, b) => b.interest_rate - a.interest_rate);

  const plans: LoanPayoffPlan[] = [];
  let totalInterest = 0;
  let currentMonth = 0;

  // Simular pagos mes a mes
  const balances = new Map(loans.map(l => [l.id, l.remaining_balance]));

  while (Array.from(balances.values()).some(b => b > 0)) {
    currentMonth++;
    let availableExtra = extraPayment;

    sortedLoans.forEach(loan => {
      const balance = balances.get(loan.id) || 0;
      if (balance <= 0) return;

      // Calcular interés del mes
      const monthlyInterest = balance * (loan.interest_rate / 100 / 12);
      totalInterest += monthlyInterest;

      // Pago mínimo + extra disponible
      let payment = loan.monthly_payment;
      if (sortedLoans.indexOf(loan) === sortedLoans.findIndex(l => (balances.get(l.id) || 0) > 0)) {
        payment += availableExtra;
        availableExtra = 0;
      }

      const principal = payment - monthlyInterest;
      const newBalance = Math.max(0, balance - principal);
      balances.set(loan.id, newBalance);

      // Registrar pago
      if (!plans.find(p => p.loanId === loan.id)) {
        plans.push({
          loanId: loan.id,
          loanName: loan.name,
          payoffOrder: 0,
          payoffDate: new Date(),
          totalPaid: 0,
          interestPaid: 0,
          monthlyPayments: []
        });
      }

      const plan = plans.find(p => p.loanId === loan.id)!;
      plan.monthlyPayments.push({
        month: currentMonth,
        payment,
        principal,
        interest: monthlyInterest,
        balance: newBalance
      });
      plan.totalPaid += payment;
      plan.interestPaid += monthlyInterest;

      if (newBalance === 0 && plan.payoffDate.getTime() === new Date().getTime()) {
        plan.payoffDate = addMonths(new Date(), currentMonth);
        plan.payoffOrder = plans.filter(p => p.payoffDate <= plan.payoffDate).length;
      }
    });
  }

  return {
    name: 'avalanche',
    loans: plans,
    totalInterestPaid: totalInterest,
    totalMonths: currentMonth,
    monthlyPayment: loans.reduce((sum, l) => sum + l.monthly_payment, 0) + extraPayment,
    freedomDate: addMonths(new Date(), currentMonth)
  };
}
```

#### 4.2 Estrategia Snowball (Motivación Psicológica)

```typescript
function calculateSnowballStrategy(
  loans: Loan[],
  extraPayment: number = 0
): DebtPayoffStrategy {
  // Ordenar por balance (menor primero)
  const sortedLoans = [...loans].sort((a, b) => a.remaining_balance - b.remaining_balance);

  // Mismo algoritmo que avalanche pero con diferente orden
  // ... (similar implementation)

  return {
    name: 'snowball',
    // ...
  };
}
```

#### 4.3 Comparador de Estrategias

```typescript
function compareStrategies(loans: Loan[], extraPayment: number = 0): {
  avalanche: DebtPayoffStrategy;
  snowball: DebtPayoffStrategy;
  recommendation: 'avalanche' | 'snowball';
  interestSavings: number;
  timeDifference: number;
} {
  const avalanche = calculateAvalancheStrategy(loans, extraPayment);
  const snowball = calculateSnowballStrategy(loans, extraPayment);

  const interestSavings = snowball.totalInterestPaid - avalanche.totalInterestPaid;
  const timeDifference = snowball.totalMonths - avalanche.totalMonths;

  // Recomendar avalanche si ahorra más de 100€ o 2+ meses
  const recommendation = (interestSavings > 100 || timeDifference > 2)
    ? 'avalanche'
    : 'snowball';

  return {
    avalanche,
    snowball,
    recommendation,
    interestSavings,
    timeDifference
  };
}
```

#### 4.4 Simulador de Escenarios

```typescript
function simulateScenario(
  currentState: FinancialState,
  scenario: ScenarioConfig
): FinancialScenario {
  const projection: number[] = [];
  let netWorth = currentState.totalAssets - currentState.totalLiabilities;

  for (let month = 1; month <= scenario.months; month++) {
    // Aplicar ingresos
    netWorth += currentState.monthlyIncome * (1 + (scenario.incomeGrowth || 0) / 12);

    // Restar gastos
    netWorth -= currentState.monthlyExpenses * (1 + (scenario.inflationRate || 0.03) / 12);

    // Aplicar retorno de inversiones
    const investments = netWorth * (scenario.investmentAllocation || 0);
    netWorth += investments * ((scenario.expectedReturn || 0.07) / 12);

    // Pagar deudas
    netWorth -= currentState.monthlyDebtPayment;

    projection.push(netWorth);
  }

  return {
    name: scenario.name,
    description: scenario.description,
    assumptions: scenario,
    projectedOutcome: {
      netWorth: projection,
      savingsGoalCompletion: calculateGoalDates(projection, currentState.savingsGoals),
      debtFreeDate: calculateDebtFreeDate(currentState.loans, scenario)
    }
  };
}
```

---

## Agente 5: Smart Notifications Agent

### Objetivo
Enviar alertas proactivas y recordatorios inteligentes.

### Ubicación
```
src/lib/agents/smartNotifications.ts
src/workers/notificationWorker.ts
```

### Interface

```typescript
interface SmartNotification {
  id: string;
  type: 'budget_alert' | 'bill_reminder' | 'goal_milestone' | 'anomaly' | 'insight';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  body: string;
  actions: NotificationAction[];
  scheduledFor: Date;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    until?: Date;
  };
}

interface NotificationAction {
  label: string;
  action: string;
  payload: Record<string, any>;
}
```

### Reglas de Notificación

```typescript
const NOTIFICATION_RULES: NotificationRule[] = [
  {
    id: 'budget_80',
    name: 'Presupuesto al 80%',
    condition: (state) => state.budgetUsage >= 80 && state.budgetUsage < 100,
    notification: {
      type: 'budget_alert',
      priority: 'high',
      title: 'Presupuesto casi agotado',
      body: 'Has usado el {usage}% de tu presupuesto en {category}'
    },
    cooldown: 24 * 60 * 60 * 1000 // 24 horas
  },
  {
    id: 'budget_exceeded',
    name: 'Presupuesto excedido',
    condition: (state) => state.budgetUsage >= 100,
    notification: {
      type: 'budget_alert',
      priority: 'urgent',
      title: 'Presupuesto excedido',
      body: 'Has superado tu presupuesto en {category} por {excess}€'
    },
    cooldown: 12 * 60 * 60 * 1000 // 12 horas
  },
  {
    id: 'recurring_due',
    name: 'Pago recurrente próximo',
    condition: (state) => state.daysUntilRecurring <= 3,
    notification: {
      type: 'bill_reminder',
      priority: 'normal',
      title: 'Pago próximo: {name}',
      body: '{name} de {amount}€ vence en {days} días'
    },
    cooldown: 24 * 60 * 60 * 1000
  },
  {
    id: 'goal_milestone',
    name: 'Hito de meta alcanzado',
    condition: (state) => [25, 50, 75, 90, 100].includes(state.goalProgress),
    notification: {
      type: 'goal_milestone',
      priority: 'normal',
      title: '🎉 ¡Progreso en tu meta!',
      body: 'Has alcanzado el {progress}% de "{goalName}"'
    },
    cooldown: 0 // Sin cooldown para milestones
  },
  {
    id: 'unusual_spending',
    name: 'Gasto inusual detectado',
    condition: (state) => state.lastTransactionZScore > 2.5,
    notification: {
      type: 'anomaly',
      priority: 'high',
      title: 'Gasto inusual detectado',
      body: '{amount}€ en {category} es mayor de lo habitual'
    },
    cooldown: 6 * 60 * 60 * 1000 // 6 horas
  }
];
```

---

## Prioridad de Implementación

| Prioridad | Agente | Complejidad | Valor |
|-----------|--------|-------------|-------|
| 1 | Budget Recommendation | Media | Alto |
| 2 | Smart Notifications | Media | Alto |
| 3 | Advanced Anomaly Detection | Alta | Alto |
| 4 | Spending Behavior | Alta | Medio |
| 5 | Financial Planning | Muy Alta | Alto |

---

## Dependencias Comunes

```typescript
// src/lib/agents/common.ts

export function calculateStats(values: number[]): Stats {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return { mean, stdDev, variance, min, max, count: n };
}

export function calculateZScore(value: number, stats: Stats): number {
  return (value - stats.mean) / stats.stdDev;
}

export function calculateSimilarity(str1: string, str2: string): number {
  // Implementación de distancia de Levenshtein normalizada
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}

export function groupByMonth<T extends { date: string }>(items: T[]): Map<string, T[]> {
  return items.reduce((map, item) => {
    const monthKey = item.date.substring(0, 7);
    const existing = map.get(monthKey) || [];
    map.set(monthKey, [...existing, item]);
    return map;
  }, new Map<string, T[]>());
}
```

---

**Última actualización:** Noviembre 2025
