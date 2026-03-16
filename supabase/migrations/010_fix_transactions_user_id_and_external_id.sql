-- =============================================
-- Fix transactions table for NextAuth (Google OAuth)
-- =============================================
-- Problem: transactions.user_id was UUID REFERENCES auth.users(id)
-- but NextAuth provides a Google string ID (not UUID).
-- Solution: change user_id to TEXT REFERENCES profiles(id)
-- Also adds external_id column for CSV deduplication.

-- STEP 1: Drop the old FK constraint (if it exists referencing auth.users)
ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;

-- STEP 2: Change user_id type from UUID to TEXT
ALTER TABLE transactions
  ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;

-- STEP 3: Add FK to profiles (NextAuth users)
ALTER TABLE transactions
  ADD CONSTRAINT transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- STEP 4: Add external_id column for CSV deduplication
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions(user_id, external_id)
  WHERE external_id IS NOT NULL;

-- STEP 5: Fix RLS policies to use TEXT comparison
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;

-- Note: supabaseAdmin bypasses RLS so these are not strictly needed,
-- but keep them correct for direct Supabase client usage.
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid()::text = user_id);
