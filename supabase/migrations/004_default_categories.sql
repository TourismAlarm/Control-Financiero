-- =============================================
-- Default Categories Migration
-- =============================================
-- This migration creates a function and trigger to automatically
-- insert default categories when a new user profile is created

-- =============================================
-- FUNCTION: Create Default Categories for New User
-- =============================================
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
-- TRIGGER: Auto-create categories on profile creation
-- =============================================
DROP TRIGGER IF EXISTS trigger_create_default_categories ON profiles;

CREATE TRIGGER trigger_create_default_categories
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_categories_for_user();

-- =============================================
-- BACKFILL: Add default categories to existing users
-- =============================================
-- This section adds default categories to users who were created
-- before this migration was run

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through all existing users who don't have categories yet
  FOR user_record IN
    SELECT DISTINCT p.id
    FROM profiles p
    LEFT JOIN categories c ON c.user_id = p.id
    WHERE c.id IS NULL
  LOOP
    -- Insert default EXPENSE categories
    INSERT INTO categories (user_id, name, type, icon, color, is_system)
    VALUES
      (user_record.id, 'Alimentación', 'expense', '🍔', '#EF4444', true),
      (user_record.id, 'Transporte', 'expense', '🚗', '#F97316', true),
      (user_record.id, 'Vivienda', 'expense', '🏠', '#FB923C', true),
      (user_record.id, 'Servicios', 'expense', '💡', '#FBBF24', true),
      (user_record.id, 'Salud', 'expense', '🏥', '#A3E635', true),
      (user_record.id, 'Educación', 'expense', '📚', '#4ADE80', true),
      (user_record.id, 'Entretenimiento', 'expense', '🎮', '#34D399', true),
      (user_record.id, 'Compras', 'expense', '🛍️', '#2DD4BF', true),
      (user_record.id, 'Ropa', 'expense', '👕', '#22D3EE', true),
      (user_record.id, 'Restaurantes', 'expense', '🍽️', '#38BDF8', true),
      (user_record.id, 'Viajes', 'expense', '✈️', '#60A5FA', true),
      (user_record.id, 'Tecnología', 'expense', '💻', '#818CF8', true),
      (user_record.id, 'Deporte', 'expense', '⚽', '#A78BFA', true),
      (user_record.id, 'Mascotas', 'expense', '🐕', '#C084FC', true),
      (user_record.id, 'Regalos', 'expense', '🎁', '#E879F9', true),
      (user_record.id, 'Seguros', 'expense', '🛡️', '#F472B6', true),
      (user_record.id, 'Impuestos', 'expense', '📋', '#FB7185', true),
      (user_record.id, 'Otros Gastos', 'expense', '📌', '#F87171', true)
    ON CONFLICT (user_id, name, type) DO NOTHING;

    -- Insert default INCOME categories
    INSERT INTO categories (user_id, name, type, icon, color, is_system)
    VALUES
      (user_record.id, 'Salario', 'income', '💼', '#10B981', true),
      (user_record.id, 'Freelance', 'income', '💻', '#14B8A6', true),
      (user_record.id, 'Negocio', 'income', '🏢', '#06B6D4', true),
      (user_record.id, 'Inversiones', 'income', '📈', '#0EA5E9', true),
      (user_record.id, 'Alquiler', 'income', '🏠', '#3B82F6', true),
      (user_record.id, 'Intereses', 'income', '💰', '#6366F1', true),
      (user_record.id, 'Bonificación', 'income', '🎉', '#8B5CF6', true),
      (user_record.id, 'Regalos', 'income', '🎁', '#A855F7', true),
      (user_record.id, 'Otros Ingresos', 'income', '📌', '#10B981', true)
    ON CONFLICT (user_id, name, type) DO NOTHING;
  END LOOP;
END $$;

-- =============================================
-- VERIFICATION
-- =============================================
-- Check that categories were created
-- SELECT COUNT(*), user_id FROM categories GROUP BY user_id;
