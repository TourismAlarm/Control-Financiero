# Agentes Inteligentes - Control Financiero

Este documento describe los sistemas inteligentes (agentes) implementados y planificados en Control Financiero.

## Concepto de Agentes

En Control Financiero, los "agentes" son componentes React con lógica de análisis que procesan datos financieros y proporcionan insights automatizados al usuario. No son agentes de IA en el sentido tradicional, sino algoritmos estadísticos y de machine learning integrados en la UI.

---

## Agentes Implementados

### 1. Pattern Detector (Detector de Patrones)

**Archivo:** `src/components/charts/PatternDetector.tsx`

**Propósito:** Detectar anomalías y patrones en las transacciones del usuario.

#### Algoritmos Implementados

##### 1.1 Detección de Gastos Anómalos
```
Fórmula: gasto > promedio + 2σ (desviación estándar)

σ = √(Σ(xi - μ)² / n)

Donde:
- xi = cada gasto individual
- μ = promedio de gastos
- n = número de transacciones
```

**Ejemplo:**
- Promedio de gastos: 50€
- Desviación estándar: 20€
- Umbral: 50 + (2 × 20) = 90€
- Cualquier gasto > 90€ se marca como anómalo

##### 1.2 Crecimiento de Categorías
```
Crecimiento = ((gastoActual - gastoPrevio) / gastoPrevio) × 100

Alerta si: Crecimiento > 50%
```

Compara los últimos 30 días vs los 30 días anteriores por categoría.

##### 1.3 Detección de Transacciones Recurrentes
```
1. Normalizar descripciones (eliminar números, símbolos)
2. Agrupar por descripción normalizada
3. Si count >= 3 → Patrón recurrente detectado
```

##### 1.4 Evaluación de Tasa de Ahorro
```
Tasa = ((ingresos - gastos) / ingresos) × 100

Estados:
- > 20%: Excelente (verde)
- 0-20%: Normal
- < 0%: Alerta - gastos superiores a ingresos (rojo)
```

##### 1.5 Patrón Semanal
Agrupa gastos por día de la semana e identifica el día con mayor gasto promedio.

#### Requisitos
- Mínimo 10 transacciones para activar el análisis

#### Output
Tarjetas de alerta con tres tipos:
- **Warning** (naranja): Anomalías que requieren atención
- **Info** (azul): Información útil sobre patrones
- **Success** (verde): Indicadores positivos

---

### 2. Expense Projection (Proyección de Gastos)

**Archivo:** `src/components/charts/ExpenseProjection.tsx`

**Propósito:** Predecir gastos e ingresos futuros usando regresión lineal.

#### Algoritmo: Regresión Lineal Simple

```
y = mx + b

Donde:
- y = valor proyectado
- m = pendiente (slope)
- x = índice del mes
- b = intercepto

Cálculo de m (slope):
m = (n×Σxy - Σx×Σy) / (n×Σx² - (Σx)²)

Cálculo de b (intercept):
b = (Σy - m×Σx) / n
```

#### Implementación

```typescript
function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const indices = Array.from({ length: n }, (_, i) => i);

  const sumX = indices.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}
```

#### Flujo de Datos

```
1. Agrupar transacciones por mes
2. Tomar últimos 6 meses de histórico
3. Calcular regresión lineal para gastos
4. Calcular regresión lineal para ingresos
5. Proyectar 3 meses hacia adelante
6. Calcular tendencias vs promedio
```

#### Métricas Generadas

| Métrica | Descripción |
|---------|-------------|
| Gastos Proyectados | Valor estimado de gastos para próximos 3 meses |
| Ingresos Proyectados | Valor estimado de ingresos para próximos 3 meses |
| Tendencia de Gastos | % de cambio vs promedio histórico |
| Tendencia de Ingresos | % de cambio vs promedio histórico |
| Balance Proyectado | Ingresos - Gastos estimado |

#### Requisitos
- Mínimo 3 meses de datos históricos

#### Visualización
- Gráfico de líneas con Recharts
- Líneas sólidas: datos reales
- Líneas discontinuas: proyecciones
- Indicadores de tendencia con iconos

---

### 3. Auto-Categorization Engine (Motor de Auto-Categorización)

**Archivo:** `src/lib/categorization/autoCategorize.ts`

**Propósito:** Categorizar automáticamente transacciones basándose en keywords.

#### Sistema de Reglas

```typescript
interface CategorizationRule {
  keywords: string[];    // Palabras clave a buscar
  category: string;      // Categoría asignada
  priority: number;      // Prioridad (mayor = preferente)
}
```

#### Reglas por Defecto (30+)

| Categoría | Keywords de Ejemplo | Prioridad |
|-----------|---------------------|-----------|
| Alimentación | mercadona, carrefour, lidl, aldi, día | 10 |
| Restaurantes | restaurante, bar, cafetería, mcdonalds | 10 |
| Transporte | gasolina, taxi, uber, metro, renfe | 10 |
| Vivienda | alquiler, luz, agua, iberdrola | 9-10 |
| Telecomunicaciones | movistar, vodafone, orange, fibra | 10 |
| Entretenimiento | netflix, spotify, amazon prime | 10 |
| Salud | farmacia, médico, hospital, dentista | 10 |
| Compras | amazon, ebay, zara, h&m | 8 |
| Educación | universidad, colegio, curso | 10 |
| Nómina | nómina, salario, sueldo | 10 |

#### Algoritmo de Matching

```typescript
function autoCategorize(description: string): string | null {
  const lowerDesc = description.toLowerCase();

  // 1. Filtrar reglas que coinciden
  const matches = rules.filter(rule =>
    rule.keywords.some(keyword =>
      lowerDesc.includes(keyword.toLowerCase())
    )
  );

  // 2. Ordenar por prioridad (mayor primero)
  matches.sort((a, b) => b.priority - a.priority);

  // 3. Retornar categoría de mayor prioridad
  return matches[0]?.category || null;
}
```

#### Reglas Personalizadas

Los usuarios pueden crear reglas adicionales que se guardan en localStorage:

```typescript
// Guardar reglas custom
saveCustomRules([
  { keywords: ['gimnasio'], category: 'Salud', priority: 10 }
]);

// Obtener todas las reglas (default + custom)
const allRules = getAllRules();
```

---

### 4. Financial Health Score (Puntuación de Salud Financiera)

**Archivo:** `src/hooks/useFinancialSummary.ts`

**Propósito:** Calcular una puntuación de 0-100 que refleja la salud financiera general.

#### Fórmula del Score

```
Score = (ratioScore × 0.4) + (savingsScore × 0.3) +
        (budgetScore × 0.2) + (balanceScore × 0.1)

Donde cada componente tiene valor 0-100
```

#### Componentes del Score

##### 4.1 Ratio Ingresos/Gastos (40%)
```
Si ingresos = 0: score = 0
Si ratio >= 2.0: score = 100
Si ratio >= 1.5: score = 80
Si ratio >= 1.2: score = 60
Si ratio >= 1.0: score = 40
Si ratio < 1.0: score = 20
```

##### 4.2 Tasa de Ahorro (30%)
```
savingsRate = ((ingresos - gastos) / ingresos) × 100

Si savingsRate >= 30%: score = 100
Si savingsRate >= 20%: score = 80
Si savingsRate >= 10%: score = 60
Si savingsRate >= 0%: score = 40
Si savingsRate < 0%: score = 0
```

##### 4.3 Adherencia al Presupuesto (20%)
```
budgetUsage = (gastoReal / presupuesto) × 100

Si usage <= 80%: score = 100
Si usage <= 90%: score = 80
Si usage <= 100%: score = 60
Si usage <= 110%: score = 40
Si usage > 110%: score = 20
```

##### 4.4 Balance de Cuentas (10%)
```
Si balance > 3 meses de gastos: score = 100
Si balance > 1 mes de gastos: score = 60
Si balance > 0: score = 30
Si balance <= 0: score = 0
```

#### Interpretación del Score

| Rango | Color | Estado | Descripción |
|-------|-------|--------|-------------|
| 80-100 | Verde | Excelente | Finanzas muy saludables |
| 60-79 | Amarillo | Aceptable | Algunas áreas de mejora |
| 40-59 | Naranja | Atención | Requiere acción |
| 0-39 | Rojo | Crítico | Situación preocupante |

---

## Agentes Planificados

### 5. Budget Recommendation Agent

**Estado:** Planificado

**Propósito:** Sugerir presupuestos realistas basados en el historial de gastos.

#### Algoritmo Propuesto

```
1. Analizar últimos 3-6 meses de gastos por categoría
2. Calcular promedio y desviación estándar por categoría
3. Identificar categorías con alta variabilidad
4. Proponer presupuesto = promedio + (0.5 × σ)
5. Ajustar según metas de ahorro del usuario
```

#### Features Planificadas
- Recomendaciones personalizadas por categoría
- Ajustes estacionales (ej: más gasto en vacaciones)
- Alertas proactivas cuando se acerca al límite

---

### 6. Anomaly Detection Agent (Avanzado)

**Estado:** Planificado

**Propósito:** Detectar fraudes, duplicados y transacciones sospechosas.

#### Algoritmos Propuestos

##### 6.1 Detección de Duplicados
```
Criterios:
- Mismo monto (exacto o ±0.01)
- Misma descripción (fuzzy match >80%)
- Dentro de 7 días
```

##### 6.2 Detección de Fraude
```
Señales de alerta:
- Transacciones fuera de horario habitual
- Ubicación geográfica inusual (si disponible)
- Monto significativamente mayor al histórico
- Múltiples transacciones rápidas
```

##### 6.3 Isolation Forest (ML)
Algoritmo de machine learning para detectar outliers multidimensionales.

---

### 7. Spending Behavior Agent

**Estado:** Planificado

**Propósito:** Analizar y predecir comportamiento de gasto del usuario.

#### Características Planificadas
- Identificar triggers de gasto impulsivo
- Detectar cambios de hábitos a largo plazo
- Comparar con perfiles similares (benchmarking)
- Gamificación de metas de ahorro

---

### 8. Financial Planning Agent

**Estado:** Planificado

**Propósito:** Optimización de deudas y planificación financiera.

#### Features Planificadas
- Estrategia avalanche vs snowball para préstamos
- Optimización de orden de pago de deudas
- Simulación de escenarios (qué pasa si...)
- Proyección de fecha de libertad financiera

---

### 9. Banking Sync Agent

**Estado:** Planificado (Baja prioridad)

**Propósito:** Sincronización automática con cuentas bancarias.

#### Requisitos
- Integración con APIs bancarias (PSD2/Open Banking)
- Reconciliación automática de transacciones
- Detección de transacciones pendientes

---

## Arquitectura de Agentes

```
┌─────────────────────────────────────────────────────────┐
│                    React Components                      │
│  PatternDetector │ ExpenseProjection │ HealthScore      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   Analysis Engines                       │
│  Statistical │ Regression │ Rule-based │ ML (futuro)    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    Data Layer                            │
│  useTransactions │ useBudgets │ useFinancialSummary     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   Supabase Database                      │
│  transactions │ budgets │ accounts │ categories         │
└─────────────────────────────────────────────────────────┘
```

## Guía de Desarrollo de Nuevos Agentes

### Estructura Recomendada

```typescript
// src/components/agents/NuevoAgente.tsx

interface NuevoAgenteProps {
  data: DataType[];
  options?: AgentOptions;
}

export function NuevoAgente({ data, options }: NuevoAgenteProps) {
  // 1. Validar datos mínimos
  if (data.length < MINIMUM_REQUIRED) {
    return <NoDataMessage />;
  }

  // 2. Procesar datos
  const analysis = analyzeData(data);

  // 3. Generar insights
  const insights = generateInsights(analysis);

  // 4. Renderizar resultados
  return (
    <div className="agent-container">
      {insights.map(insight => (
        <InsightCard key={insight.id} {...insight} />
      ))}
    </div>
  );
}
```

### Checklist para Nuevos Agentes

- [ ] Definir requisitos mínimos de datos
- [ ] Implementar validación de entrada
- [ ] Documentar algoritmo utilizado
- [ ] Crear tests unitarios
- [ ] Añadir manejo de errores
- [ ] Optimizar rendimiento para datasets grandes
- [ ] Documentar en AGENTS.md

---

**Última actualización:** Noviembre 2025
