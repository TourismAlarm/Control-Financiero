-- =============================================
-- Add onboarding_completed field to profiles table
-- =============================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding ON profiles(onboarding_completed);

-- Add comment
COMMENT ON COLUMN profiles.onboarding_completed IS 'Indicates whether the user has completed the initial onboarding flow';
