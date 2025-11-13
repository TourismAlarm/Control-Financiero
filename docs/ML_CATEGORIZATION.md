# Sistema de Categorización Automática con ML

## Descripción General

El sistema de categorización automática utiliza técnicas de Machine Learning para sugerir categorías apropiadas para tus transacciones basándose en el historial previo y patrones aprendidos.

## Características Principales

### 🧠 Aprendizaje Inteligente
- **Aprende de tu historial**: El sistema analiza todas tus transacciones categorizadas previamente
- **Extracción de patrones**: Identifica palabras clave y patrones en las descripciones
- **Mejora continua**: Mientras más transacciones categorizas, más preciso se vuelve

### 🎯 Múltiples Estrategias de Matching

1. **Coincidencia Exacta (95% confianza)**
   - Encuentra descripciones idénticas en tu historial
   - La mayor precisión posible

2. **Coincidencia Similar (70-90% confianza)**
   - Analiza similitud entre descripciones
   - Compara palabras clave y tokens

3. **Matching por Palabras Clave (50-85% confianza)**
   - Identifica palabras comunes en las descripciones
   - Pondera por frecuencia de uso

4. **Patrones de Montos (20-40% confianza)**
   - Detecta transacciones con montos similares
   - Útil para pagos recurrentes

### 💡 Sugerencias en Tiempo Real
- Las sugerencias aparecen automáticamente mientras escribes
- Mínimo 3 caracteres para activar sugerencias
- Actualización instantánea al cambiar la descripción

### 📊 Indicadores de Confianza
- Cada sugerencia incluye un porcentaje de confianza (0-100%)
- Código de colores:
  - 🟢 Verde (80-100%): Alta confianza
  - 🔵 Azul (60-79%): Media confianza
  - ⚪ Gris (0-59%): Baja confianza

## Cómo Usar

### 1. Configuración Inicial

El sistema funciona automáticamente, pero necesita datos para entrenar:

1. Ve a la pestaña **"ML Categorización"** en el menú principal
2. Añade al menos 10-20 transacciones con categorías
3. El sistema se entrenará automáticamente con tu historial

### 2. Crear Nueva Transacción

Cuando crees una nueva transacción:

1. Completa el campo **Descripción**
2. Espera 3+ caracteres para ver sugerencias
3. Revisa las sugerencias con sus niveles de confianza
4. Haz clic en la sugerencia deseada para aplicarla
5. También puedes seleccionar manualmente otra categoría

### 3. Re-entrenar el Modelo

Si quieres actualizar el modelo con todos tus datos:

1. Ve a **"ML Categorización"** en el menú
2. Haz clic en **"Entrenar Modelo"**
3. Espera unos segundos mientras se procesa
4. Verás las estadísticas actualizadas

## Arquitectura Técnica

### Componentes Principales

```
src/
├── lib/
│   └── ml/
│       └── categorization.ts          # Motor de categorización ML
├── hooks/
│   └── useMLCategorization.ts        # Hook personalizado React
├── components/
│   ├── ml/
│   │   ├── CategorySuggestions.tsx   # UI de sugerencias
│   │   └── MLDashboard.tsx           # Panel de control ML
│   └── finance/
│       └── TransactionForm.tsx       # Formulario integrado
└── app/
    └── api/
        └── ml/
            ├── categorize/route.ts   # Endpoint de sugerencias
            └── train/route.ts        # Endpoint de entrenamiento
```

### Motor de Categorización (`CategorizationEngine`)

**Clase principal**: `CategorizationEngine`

#### Métodos Principales:

```typescript
// Entrenar con datos históricos
train(transactions: Transaction[]): void

// Obtener sugerencias para una descripción
suggest(description: string, amount?: number, type?: 'income' | 'expense'): CategorySuggestion[]

// Exportar modelo entrenado
exportModel(): string

// Importar modelo guardado
static importModel(data: string): MLModel

// Obtener estadísticas
getStats(): ModelStats
```

#### Algoritmos Utilizados:

1. **Extracción de Keywords**
   - Elimina stop words (español e inglés)
   - Normaliza texto a minúsculas
   - Filtra palabras cortas (<3 caracteres)
   - Elimina números puros

2. **Similitud de Texto**
   - Comparación de tokens comunes
   - Cálculo de overlap de keywords
   - Scoring ponderado (keywords 70%, tokens 30%)

3. **Pattern Matching**
   - Frecuencia de uso por categoría
   - Análisis de montos promedio
   - Detección de patrones recurrentes

### API Endpoints

#### `GET /api/ml/categorize`

Obtiene sugerencias de categoría para una descripción.

**Query Parameters:**
- `description` (requerido): Descripción de la transacción
- `amount` (opcional): Monto de la transacción
- `type` (opcional): `'income'` o `'expense'`

**Respuesta:**
```json
{
  "suggestions": [
    {
      "categoryId": "uuid",
      "categoryName": "Alimentación",
      "confidence": 0.95,
      "reason": "exact_match",
      "matchedPattern": "mercadona compra"
    }
  ],
  "stats": {
    "version": "1.0.0",
    "trainingDataSize": 150,
    "patternsCount": 12,
    "lastTrained": "2025-01-15T10:30:00Z"
  }
}
```

#### `POST /api/ml/train`

Entrena el modelo con todo el historial del usuario.

**Respuesta:**
```json
{
  "message": "Modelo entrenado exitosamente con 150 transacciones",
  "stats": {
    "transactionsCount": 150,
    "categoriesCount": 12,
    "patternsCount": 12,
    "version": "1.0.0"
  },
  "modelSize": 45678
}
```

#### `GET /api/ml/train`

Obtiene estadísticas del modelo sin re-entrenar.

**Respuesta:**
```json
{
  "transactionsCount": 150,
  "categoriesCount": 12,
  "message": "Datos disponibles para entrenamiento"
}
```

## Rendimiento

### Precisión Esperada

| Transacciones | Precisión Estimada |
|---------------|-------------------|
| 10-50         | 60-70%           |
| 50-100        | 70-80%           |
| 100-200       | 80-90%           |
| 200+          | 85-95%           |

### Optimizaciones

- **Caché de sugerencias**: 30 segundos por descripción
- **Límite de entrenamiento**: Últimas 500 transacciones
- **Debounce**: Mínimo 3 caracteres antes de consultar
- **Lazy loading**: Sugerencias solo para transacciones nuevas

## Mejores Prácticas

### Para Usuarios

1. **Sé consistente** con las descripciones
   - ✅ "Mercadona - compra semanal"
   - ❌ "Compras", "Mercadona", "Supermercado"

2. **Categoriza correctamente** desde el inicio
   - El sistema aprende de tus decisiones
   - Correcciones mejoran el modelo

3. **Usa descripciones descriptivas**
   - Incluye el comercio/servicio
   - Añade contexto cuando sea útil

4. **Re-entrena periódicamente**
   - Después de importar transacciones
   - Cuando cambies patrones de gasto

### Para Desarrolladores

1. **No sobrecargar el modelo**
   - Límite de 500 transacciones en training
   - Implementar paginación si crece mucho

2. **Validar datos de entrada**
   - Sanitizar descripciones
   - Validar tipos de categorías

3. **Monitorear rendimiento**
   - Logs en el entrenamiento
   - Métricas de precisión

4. **Considerar caché persistente**
   - Actualmente se re-entrena cada vez
   - Futuro: guardar modelo en base de datos

## Limitaciones Conocidas

1. **No es ML "verdadero"**
   - Usa heurísticas y similitud de texto
   - No es una red neuronal o modelo estadístico complejo

2. **Requiere datos históricos**
   - Mínimo 10-20 transacciones categorizadas
   - No funciona bien con usuarios nuevos

3. **Sensible a inconsistencias**
   - Descripciones muy diferentes reducen precisión
   - Categorización incorrecta afecta el aprendizaje

4. **Sin soporte multiidioma avanzado**
   - Stop words solo en español e inglés
   - Puede mejorar con más idiomas

## Roadmap Futuro

### Corto Plazo (v1.1)
- [ ] Persistencia del modelo en base de datos
- [ ] Feedback explícito (👍 👎) en sugerencias
- [ ] Métricas de precisión por categoría

### Medio Plazo (v1.2)
- [ ] Detección de comercios con NER
- [ ] Integración con APIs bancarias
- [ ] Sugerencias basadas en horarios/días

### Largo Plazo (v2.0)
- [ ] Modelo ML real (TensorFlow.js o similar)
- [ ] Transfer learning entre usuarios (anónimo)
- [ ] Detección de anomalías y fraude
- [ ] OCR para recibos y facturas

## Soporte y Contribuciones

Para reportar bugs o sugerir mejoras:
1. Abre un issue en el repositorio
2. Incluye ejemplos de transacciones problemáticas
3. Describe el comportamiento esperado vs actual

## Licencia

Este sistema de ML está incluido en el proyecto Control Financiero y sigue la misma licencia del proyecto principal.

---

**Versión**: 1.0.0
**Última actualización**: Enero 2025
**Autor**: Sistema de Categorización ML
