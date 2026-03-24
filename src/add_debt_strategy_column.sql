-- Add debt_strategy column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS debt_strategy TEXT DEFAULT 'snowball';

-- Comment: Stores the selected debt payment strategy ('snowball' or 'avalanche')
