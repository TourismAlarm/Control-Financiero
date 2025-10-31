# Database Migrations

## 001_initial_schema.sql

Esquema inicial completo para el sistema de control financiero.

### Tablas incluidas:
- profiles, accounts, categories
- transactions, recurring_rules, budgets
- transfers, loans, loan_payments
- savings_goals

### Características:
- ✅ RLS policies en todas las tablas
- ✅ Índices optimizados
- ✅ Triggers para updated_at
- ✅ Constraints y validaciones

### Cómo aplicar:

#### Dashboard de Supabase:
1. Copia el contenido de `001_initial_schema.sql`
2. Pégalo en el SQL Editor
3. Ejecuta

#### CLI de Supabase:
```bash
supabase db push
```
