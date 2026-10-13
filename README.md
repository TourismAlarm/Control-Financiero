# Control Financiero

Sistema de gestión financiera personal con inteligencia artificial integrada. Desarrollado con Next.js 15, TypeScript, Supabase y algoritmos de análisis predictivo.

## Características Principales

### Gestión Financiera
- **Transacciones**: Registro completo de ingresos y gastos
- **Cuentas**: Gestión de múltiples cuentas bancarias
- **Presupuestos**: Control de límites por categoría
- **Metas de Ahorro**: Seguimiento de objetivos financieros
- **Préstamos**: Gestión de deudas con amortización

### Sistemas Inteligentes (Agentes)
- **Pattern Detector**: Detecta anomalías en gastos usando análisis estadístico (desviación >2σ)
- **Expense Projection**: Proyecciones a 3 meses mediante regresión lineal
- **Auto-Categorización**: Categorización automática con 30+ reglas de palabras clave
- **Financial Health Score**: Puntuación de salud financiera (0-100)

### Exportación e Importación
- Importación de CSV con auto-categorización
- Exportación a PDF, Excel y JSON
- Backup completo de datos

### PWA (Progressive Web App)
- Instalable en dispositivos móviles
- Soporte offline básico
- Service Worker integrado

## Sincronización bancaria (Enable Banking)

Los movimientos de BBVA, Revolut y Trade Republic entran solos cada mañana (cron de Vercel a las 05:17 UTC) a través de [Enable Banking](https://enablebanking.com), en modo de uso personal.

**Puesta en marcha (una vez):**

1. Base de datos **nueva**: pega `supabase/schema_completo.sql` entero en el SQL Editor de Supabase. (Si vienes de la base antigua, basta con `supabase/migrations/011_bank_sync.sql`.)
2. En el panel de Enable Banking: crea una aplicación de **producción**, descarga la clave privada `.pem`, añade como redirect URL `https://control-financiero-one.vercel.app/api/banking/callback` y actívala vinculando tus cuentas ("Activate by linking accounts").
3. En Vercel → Settings → Environment Variables:
   - `ENABLE_BANKING_APP_ID` — id de la aplicación
   - `ENABLE_BANKING_PRIVATE_KEY` — contenido del `.pem` (se aceptan saltos de línea como `\n`)
   - `CRON_SECRET` — cualquier cadena larga aleatoria
   - `ENABLE_BANKING_REDIRECT_URL` *(opcional)* — si no, se usa `NEXTAUTH_URL` + `/api/banking/callback`
   - `BANK_OWN_NAMES` *(opcional)* — variantes de tu nombre separadas por `|` (p. ej. `Jordi Elias|Elias Serra Jordi`)
4. En la app: **Configuración → Bancos conectados → Conectar un banco**.

**Cómo clasifica cada movimiento** (`src/lib/banking/transform.ts`):

| Tipo | Cuándo | ¿Cuenta como gasto? |
|------|--------|---------------------|
| `internal_transfer` | IBAN propio, va/viene de otro de tus bancos o a tu propio nombre | No (oculto por defecto) |
| `investment` | Hacia un exchange o broker, o plan de ahorro dentro de Trade Republic | Sí, aparte |
| `debt_payment` | El concepto coincide con el acreedor de una deuda registrada | Sí, aparte |
| `regular` | Todo lo demás; se categoriza automáticamente | Sí |

`GET /api/transactions?include_internal=1` devuelve también los traspasos. Tests: `npm run test:banking`.

## Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| **Frontend** | Next.js 15.5, React 18.3, TypeScript |
| **Estilos** | Tailwind CSS 4, Radix UI |
| **Estado** | TanStack Query v5 |
| **Formularios** | React Hook Form + Zod |
| **Backend** | Supabase (PostgreSQL) |
| **Auth** | NextAuth + Google OAuth |
| **Gráficos** | Recharts |
| **Exportación** | jsPDF, ExcelJS |
| **Cálculos** | Decimal.js (precisión monetaria) |

## Requisitos Previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Credenciales de Google OAuth

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/TourismAlarm/Control-Financiero.git
cd Control-Financiero

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Ejecutar en desarrollo
npm run dev
```

## Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu_secret_generado

# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
```

## Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes REST
│   │   ├── accounts/      # CRUD cuentas
│   │   ├── auth/          # NextAuth endpoints
│   │   ├── categories/    # CRUD categorías
│   │   ├── loans/         # CRUD préstamos
│   │   └── transactions/  # CRUD transacciones
│   ├── configuracion/     # Página de ajustes
│   ├── onboarding/        # Setup inicial
│   └── page.tsx           # Dashboard principal
├── components/
│   ├── charts/            # Gráficos y análisis
│   │   ├── PatternDetector.tsx
│   │   ├── ExpenseProjection.tsx
│   │   ├── CategoryDistribution.tsx
│   │   └── MonthlyTrends.tsx
│   ├── finance/           # Componentes financieros
│   │   ├── TransactionForm.tsx
│   │   ├── TransactionsList.tsx
│   │   ├── FinancialDashboard.tsx
│   │   ├── AccountsManager.tsx
│   │   ├── BudgetOverview.tsx
│   │   └── SavingsGoals.tsx
│   ├── loans/             # Gestión de préstamos
│   └── import/            # Importación CSV
├── hooks/                 # Custom hooks (TanStack Query)
│   ├── useTransactions.ts
│   ├── useAccounts.ts
│   ├── useBudgets.ts
│   ├── useLoans.ts
│   ├── useFinancialSummary.ts
│   ├── useRecurringRules.ts
│   └── useSavingsGoals.ts
├── lib/
│   ├── categorization/    # Motor de auto-categorización
│   ├── export/            # Exportación PDF/Excel
│   ├── supabase/          # Cliente Supabase
│   └── validations/       # Esquemas Zod
└── types/                 # Definiciones TypeScript
```

## Base de Datos

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuario |
| `accounts` | Cuentas bancarias |
| `categories` | Categorías de transacciones |
| `transactions` | Ingresos y gastos |
| `budgets` | Presupuestos mensuales |
| `recurring_rules` | Transacciones recurrentes |
| `loans` | Préstamos y deudas |
| `loan_payments` | Pagos de préstamos |
| `savings_goals` | Metas de ahorro |
| `transfers` | Transferencias entre cuentas |

## Scripts Disponibles

```bash
npm run dev      # Servidor de desarrollo (puerto 3000)
npm run build    # Build de producción
npm run start    # Servidor de producción
npm run lint     # Linter ESLint
```

## Documentación Adicional

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura del sistema
- [AGENTS.md](./AGENTS.md) - Documentación de agentes inteligentes
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - Documentación de APIs
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Guía de testing
- [REFACTORING.md](./REFACTORING.md) - Detalles de refactorización

## Roadmap

### Completado
- [x] Autenticación con Google OAuth
- [x] CRUD completo de transacciones
- [x] Sistema de presupuestos
- [x] Metas de ahorro
- [x] Gestión de préstamos
- [x] Pattern Detector (anomalías)
- [x] Expense Projection (predicciones)
- [x] Auto-categorización
- [x] Exportación PDF/Excel/JSON
- [x] Importación CSV
- [x] PWA básico

### En Progreso
- [ ] Mes financiero personalizado (basado en día de pago)
- [ ] Modo oscuro completo

### Planificado
- [ ] Transferencias entre cuentas
- [ ] Soporte multi-divisa
- [ ] Notificaciones push
- [ ] Conexión con APIs bancarias
- [ ] Budget Recommendation Agent
- [ ] Anomaly Detection Agent avanzado

## Contribuir

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y de uso personal.

---

**Desarrollado con Next.js + Supabase + TypeScript**
