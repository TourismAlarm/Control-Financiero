-- =============================================
-- FIX RECURRING_RULES TABLE FOR NEXTAUTH
-- =============================================
-- This migration fixes the recurring_rules table to work with NextAuth
-- Changes user_id from UUID (auth.users) to TEXT (profiles with Google ID)

-- Step 1: Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own recurring rules" ON recurring_rules;
DROP POLICY IF EXISTS "Users can create own recurring rules" ON recurring_rules;
DROP POLICY IF EXISTS "Users can update own recurring rules" ON recurring_rules;
DROP POLICY IF EXISTS "Users can delete own recurring rules" ON recurring_rules;

-- Step 2: Drop existing foreign key constraint
ALTER TABLE recurring_rules DROP CONSTRAINT IF EXISTS recurring_rules_user_id_fkey;

-- Step 3: Change user_id column from UUID to TEXT
ALTER TABLE recurring_rules ALTER COLUMN user_id TYPE TEXT;

-- Step 4: Add new foreign key to profiles table
ALTER TABLE recurring_rules
  ADD CONSTRAINT recurring_rules_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 5: Create new RLS policies for profiles (Google ID)
CREATE POLICY "Users can view own recurring rules" ON recurring_rules
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can create own recurring rules" ON recurring_rules
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own recurring rules" ON recurring_rules
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can delete own recurring rules" ON recurring_rules
  FOR DELETE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Step 6: Add comment for documentation
COMMENT ON TABLE recurring_rules IS 'Recurring transaction rules. user_id references profiles(id) which contains Google user IDs from NextAuth.';
