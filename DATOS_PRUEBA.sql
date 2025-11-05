-- ============================================
-- DATOS DE PRUEBA - Jordi Elias
-- Google ID: 105664097595399072691
-- ============================================

-- 1. CREAR CATEGORÍAS DE GASTOS
INSERT INTO categories (user_id, name, type, icon, color, is_system) VALUES
  ('105664097595399072691', 'Alimentación', 'expense', '🍔', '#ef4444', false),
  ('105664097595399072691', 'Transporte', 'expense', '🚗', '#f59e0b', false),
  ('105664097595399072691', 'Ocio', 'expense', '🎮', '#8b5cf6', false),
  ('105664097595399072691', 'Compras', 'expense', '🛍️', '#ec4899', false),
  ('105664097595399072691', 'Salud', 'expense', '💊', '#06b6d4', false),
  ('105664097595399072691', 'Educación', 'expense', '📚', '#3b82f6', false),
  ('105664097595399072691', 'Vivienda', 'expense', '🏠', '#10b981', false),
  ('105664097595399072691', 'Servicios', 'expense', '💡', '#f97316', false);

-- 2. CREAR CATEGORÍAS DE INGRESOS
INSERT INTO categories (user_id, name, type, icon, color, is_system) VALUES
  ('105664097595399072691', 'Salario', 'income', '💰', '#10b981', false),
  ('105664097595399072691', 'Freelance', 'income', '💼', '#3b82f6', false),
  ('105664097595399072691', 'Inversiones', 'income', '📈', '#8b5cf6', false);

-- 3. CREAR CUENTA BANCARIA
INSERT INTO accounts (user_id, name, type, balance, currency, is_active) VALUES
  ('105664097595399072691', 'Cuenta Principal', 'bank', 2500.00, 'EUR', true);

-- 4. CREAR ALGUNAS TRANSACCIONES DE EJEMPLO
-- Obtener el ID de la cuenta y categorías (necesitas ejecutar esto después de insertar las categorías)

-- Primero, obtén los IDs:
DO $$
DECLARE
  account_id UUID;
  cat_alimentacion UUID;
  cat_transporte UUID;
  cat_salario UUID;
  cat_ocio UUID;
BEGIN
  -- Obtener ID de cuenta
  SELECT id INTO account_id FROM accounts
  WHERE user_id = '105664097595399072691' AND name = 'Cuenta Principal';

  -- Obtener IDs de categorías
  SELECT id INTO cat_alimentacion FROM categories
  WHERE user_id = '105664097595399072691' AND name = 'Alimentación';

  SELECT id INTO cat_transporte FROM categories
  WHERE user_id = '105664097595399072691' AND name = 'Transporte';

  SELECT id INTO cat_salario FROM categories
  WHERE user_id = '105664097595399072691' AND name = 'Salario';

  SELECT id INTO cat_ocio FROM categories
  WHERE user_id = '105664097595399072691' AND name = 'Ocio';

  -- Insertar transacciones de ejemplo
  INSERT INTO transactions (user_id, account_id, category_id, type, amount, description, date) VALUES
    -- Ingresos
    ('105664097595399072691', account_id, cat_salario, 'income', 2500.00, 'Salario Noviembre', '2025-11-01'),

    -- Gastos
    ('105664097595399072691', account_id, cat_alimentacion, 'expense', 45.50, 'Supermercado', '2025-11-02'),
    ('105664097595399072691', account_id, cat_transporte, 'expense', 15.00, 'Gasolina', '2025-11-03'),
    ('105664097595399072691', account_id, cat_ocio, 'expense', 25.00, 'Cine con amigos', '2025-11-04'),
    ('105664097595399072691', account_id, cat_alimentacion, 'expense', 12.50, 'Café y desayuno', '2025-11-05'),
    ('105664097595399072691', account_id, cat_transporte, 'expense', 8.50, 'Metro semanal', '2025-11-05');
END $$;

-- 5. VERIFICAR
SELECT '✅ Datos de prueba creados correctamente' as resultado;

-- Mostrar resumen
SELECT
  'Categorías' as tipo,
  COUNT(*) as cantidad
FROM categories
WHERE user_id = '105664097595399072691'
UNION ALL
SELECT
  'Cuentas' as tipo,
  COUNT(*) as cantidad
FROM accounts
WHERE user_id = '105664097595399072691'
UNION ALL
SELECT
  'Transacciones' as tipo,
  COUNT(*) as cantidad
FROM transactions
WHERE user_id = '105664097595399072691';
