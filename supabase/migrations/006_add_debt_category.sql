-- =============================================
-- Add Debt Category to Default Categories
-- =============================================
-- This migration adds a "Deudas y Préstamos" category
-- to the default categories for loan payment tracking

-- Update the function to include the debt category
CREATE OR REPLACE FUNCTION create_default_categories_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default EXPENSE categories
  INSERT INTO categories (user_id, name, type, icon, color, is_system)
  VALUES
    (NEW.id, 'Alimentación', 'expense', '🍔', '#EF4444', true),
    (NEW.id, 'Transporte', 'expense', '🚗', '#F97316', true),
    (NEW.id, 'Vivienda', 'expense', '🏠', '#FB923C', true),
    (NEW.id, 'Servicios', 'expense', '💡', '#FBBF24', true),
    (NEW.id, 'Salud', 'expense', '🏥', '#A3E635', true),
    (NEW.id, 'Educación', 'expense', '📚', '#4ADE80', true),
    (NEW.id, 'Entretenimiento', 'expense', '🎮', '#34D399', true),
    (NEW.id, 'Compras', 'expense', '🛍️', '#2DD4BF', true),
    (NEW.id, 'Ropa', 'expense', '👕', '#22D3EE', true),
    (NEW.id, 'Restaurantes', 'expense', '🍽️', '#38BDF8', true),
    (NEW.id, 'Viajes', 'expense', '✈️', '#60A5FA', true),
    (NEW.id, 'Tecnología', 'expense', '💻', '#818CF8', true),
    (NEW.id, 'Deporte', 'expense', '⚽', '#A78BFA', true),
    (NEW.id, 'Mascotas', 'expense', '🐕', '#C084FC', true),
    (NEW.id, 'Regalos', 'expense', '🎁', '#E879F9', true),
    (NEW.id, 'Seguros', 'expense', '🛡️', '#F472B6', true),
    (NEW.id, 'Impuestos', 'expense', '📋', '#FB7185', true),
    (NEW.id, 'Deudas y Préstamos', 'expense', '💳', '#DC2626', true),
    (NEW.id, 'Otros Gastos', 'expense', '📌', '#F87171', true)
  ON CONFLICT (user_id, name, type) DO NOTHING;

  -- Insert default INCOME categories
  INSERT INTO categories (user_id, name, type, icon, color, is_system)
  VALUES
    (NEW.id, 'Salario', 'income', '💼', '#10B981', true),
    (NEW.id, 'Freelance', 'income', '💻', '#14B8A6', true),
    (NEW.id, 'Negocio', 'income', '🏢', '#06B6D4', true),
    (NEW.id, 'Inversiones', 'income', '📈', '#0EA5E9', true),
    (NEW.id, 'Alquiler', 'income', '🏠', '#3B82F6', true),
    (NEW.id, 'Intereses', 'income', '💰', '#6366F1', true),
    (NEW.id, 'Bonificación', 'income', '🎉', '#8B5CF6', true),
    (NEW.id, 'Regalos', 'income', '🎁', '#A855F7', true),
    (NEW.id, 'Otros Ingresos', 'income', '📌', '#10B981', true)
  ON CONFLICT (user_id, name, type) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Backfill: Add debt category to existing users
-- =============================================
-- Insert the "Deudas y Préstamos" category for all existing users
INSERT INTO categories (user_id, name, type, icon, color, is_system)
SELECT
  p.id,
  'Deudas y Préstamos',
  'expense',
  '💳',
  '#DC2626',
  true
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1
  FROM categories c
  WHERE c.user_id = p.id
  AND c.name = 'Deudas y Préstamos'
  AND c.type = 'expense'
);
