-- ============================================
-- FINAL FIX: GRANT FULL ACCESS TO COACHES
-- ============================================
-- This script grants SELECT, INSERT, UPDATE, DELETE permissions to Coaches
-- for all tables related to the Coachee's financial data.

-- 1. Ensure RLS is enabled
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_completed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payment_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop RESTRICTIVE policies (Clean Slate)
DROP POLICY IF EXISTS "Users can view their own debts" ON debts;
DROP POLICY IF EXISTS "Users can manage their own debts" ON debts;
DROP POLICY IF EXISTS "Users and Coaches can view debts" ON debts;
DROP POLICY IF EXISTS "Coaches and Owners can full access" ON debts;
DROP POLICY IF EXISTS "Coaches can view all debts" ON debts;

DROP POLICY IF EXISTS "Users can view their own settings" ON debt_settings;
DROP POLICY IF EXISTS "Users can manage their own settings" ON debt_settings;
DROP POLICY IF EXISTS "Users and Coaches can view settings" ON debt_settings;
DROP POLICY IF EXISTS "Coaches can view all debt_settings" ON debt_settings;

DROP POLICY IF EXISTS "Users can view their own completed payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Users can manage their own payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Users and Coaches can view payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Coaches can view all completed payments" ON debt_completed_payments;

DROP POLICY IF EXISTS "Users can view their own overrides" ON debt_payment_overrides;
DROP POLICY IF EXISTS "Users can manage their own overrides" ON debt_payment_overrides;
DROP POLICY IF EXISTS "Users and Coaches can view overrides" ON debt_payment_overrides;
DROP POLICY IF EXISTS "Coaches can view all payment overrides" ON debt_payment_overrides;

DROP POLICY IF EXISTS "Coaches can view all savings goals" ON user_savings_goals;
DROP POLICY IF EXISTS "Users and Coaches can view savings goals" ON user_savings_goals;

-- 3. Create PERMISSIVE Policies (Owner + Coach)

-- --- DEBTS ---
CREATE POLICY "Owner and Coach Full Access" ON debts
    FOR ALL
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

-- --- SETTINGS ---
CREATE POLICY "Owner and Coach Full Access Settings" ON debt_settings
    FOR ALL
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

-- --- COMPLETED PAYMENTS ---
CREATE POLICY "Owner and Coach Full Access Payments" ON debt_completed_payments
    FOR ALL
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

-- --- OVERRIDES ---
CREATE POLICY "Owner and Coach Full Access Overrides" ON debt_payment_overrides
    FOR ALL
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

-- --- SAVINGS GOALS (Legacy) ---
CREATE POLICY "Owner and Coach Full Access Savings" ON user_savings_goals
    FOR ALL
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

-- --- PROFILES (Crucial for the 'coach' role check to work) ---
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

-- Allow Coaches to read ALL profiles (needed to list coachees and verify their own role safely)
-- Note: To avoid recursion, we don't check 'role' inside 'profiles' policy for the user themselves in a loop.
-- Simpler approach: Allow Authenticated users to read basic profile info if needed, or:
DROP POLICY IF EXISTS "Coaches can view all profiles" ON profiles;
CREATE POLICY "Coaches can view all profiles" ON profiles
    FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles AS p WHERE p.id = auth.uid() AND p.role = 'coach')
    );
