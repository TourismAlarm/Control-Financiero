-- =============================================
-- CLEANUP AND NEXTAUTH SUPPORT MIGRATION
-- =============================================
-- This migration cleans up old tables and configures the database
-- for NextAuth (Google OAuth) with multi-user support

-- STEP 1: Remove old/duplicate tables
DROP TABLE IF EXISTS financial_data CASCADE;
DROP TABLE IF EXISTS financial_reminders CASCADE;
DROP TABLE IF EXISTS Monthly_history CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS saving_goals CASCADE;

-- STEP 2: Ensure profiles table exists with correct structure for NextAuth
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,  -- Google ID from NextAuth (not UUID)
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'EUR',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Function to create default categories for a user
CREATE OR REPLACE FUNCTION create_categories_for_user(p_user_id TEXT)
RETURNS void AS $$
BEGIN
  -- Insert EXPENSE categories
  INSERT INTO categories (user_id, name, type, icon, color, is_system)
  VALUES
    (p_user_id, 'Alimentación', 'expense', '🍔', '#EF4444', true),
    (p_user_id, 'Transporte', 'expense', '🚗', '#F97316', true),
    (p_user_id, 'Vivienda', 'expense', '🏠', '#FB923C', true),
    (p_user_id, 'Servicios', 'expense', '💡', '#FBBF24', true),
    (p_user_id, 'Salud', 'expense', '🏥', '#A3E635', true),
    (p_user_id, 'Educación', 'expense', '📚', '#4ADE80', true),
    (p_user_id, 'Entretenimiento', 'expense', '🎮', '#34D399', true),
    (p_user_id, 'Compras', 'expense', '🛍️', '#2DD4BF', true),
    (p_user_id, 'Ropa', 'expense', '👕', '#22D3EE', true),
    (p_user_id, 'Restaurantes', 'expense', '🍽️', '#38BDF8', true),
    (p_user_id, 'Viajes', 'expense', '✈️', '#60A5FA', true),
    (p_user_id, 'Tecnología', 'expense', '💻', '#818CF8', true),
    (p_user_id, 'Deporte', 'expense', '⚽', '#A78BFA', true),
    (p_user_id, 'Mascotas', 'expense', '🐕', '#C084FC', true),
    (p_user_id, 'Regalos', 'expense', '🎁', '#E879F9', true),
    (p_user_id, 'Seguros', 'expense', '🛡️', '#F472B6', true),
    (p_user_id, 'Impuestos', 'expense', '📋', '#FB7185', true),
    (p_user_id, 'Otros Gastos', 'expense', '📌', '#F87171', true)
  ON CONFLICT (user_id, name, type) DO NOTHING;

  -- Insert INCOME categories
  INSERT INTO categories (user_id, name, type, icon, color, is_system)
  VALUES
    (p_user_id, 'Salario', 'income', '💼', '#10B981', true),
    (p_user_id, 'Freelance', 'income', '💻', '#14B8A6', true),
    (p_user_id, 'Negocio', 'income', '🏢', '#06B6D4', true),
    (p_user_id, 'Inversiones', 'income', '📈', '#0EA5E9', true),
    (p_user_id, 'Alquiler', 'income', '🏠', '#3B82F6', true),
    (p_user_id, 'Intereses', 'income', '💰', '#6366F1', true),
    (p_user_id, 'Bonificación', 'income', '🎉', '#8B5CF6', true),
    (p_user_id, 'Regalos', 'income', '🎁', '#A855F7', true),
    (p_user_id, 'Otros Ingresos', 'income', '📌', '#10B981', true)
  ON CONFLICT (user_id, name, type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Trigger to auto-create categories when a profile is created
CREATE OR REPLACE FUNCTION trigger_create_categories_on_profile()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_categories_for_user(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_categories_on_profile ON profiles;

CREATE TRIGGER auto_create_categories_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_categories_on_profile();

-- STEP 5: Backfill - Create profiles and categories for existing users
-- This handles users who already have accounts/loans but no profile
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT DISTINCT user_id FROM accounts
    UNION
    SELECT DISTINCT user_id FROM loans
    WHERE user_id IS NOT NULL
  LOOP
    -- Create profile if doesn't exist
    INSERT INTO profiles (id, email)
    VALUES (user_record.user_id, user_record.user_id || '@placeholder.com')
    ON CONFLICT (id) DO NOTHING;

    -- Create categories for this user
    PERFORM create_categories_for_user(user_record.user_id);
  END LOOP;
END $$;

-- STEP 6: Update triggers for updated_at on profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- STEP 7: Comments for documentation
COMMENT ON TABLE profiles IS 'User profiles from NextAuth (Google OAuth). ID is Google user ID, not UUID.';
COMMENT ON FUNCTION create_categories_for_user IS 'Creates 27 default categories (18 expense + 9 income) for a user';
COMMENT ON TRIGGER auto_create_categories_on_profile ON profiles IS 'Automatically creates default categories when a new profile is inserted';
