-- =============================================
-- Add Financial Month Start Day to Profiles
-- =============================================
-- This migration adds a field to configure when the user's financial month starts
-- For example, if user gets paid on the 26th, they can set this to 26
-- and Nov 26 - Dec 25 will be considered "December"

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS financial_month_start_day INTEGER DEFAULT 1 CHECK (financial_month_start_day >= 1 AND financial_month_start_day <= 28);

COMMENT ON COLUMN profiles.financial_month_start_day IS
'Day of the month when the financial month starts (1-28). For example, if set to 26, transactions from Nov 26 - Dec 25 are considered part of December.';

-- Update existing users to have default value of 1
UPDATE profiles
SET financial_month_start_day = 1
WHERE financial_month_start_day IS NULL;
