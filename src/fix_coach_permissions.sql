-- Fix Coach Permissions (Run this in Supabase SQL Editor)

-- 1. Drop existing policies to prevent conflicts or recursion
DROP POLICY IF EXISTS "Coaches can view all debts" ON debts;
DROP POLICY IF EXISTS "Coaches can view all debt_settings" ON debt_settings;
DROP POLICY IF EXISTS "Coaches can view all completed payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Coaches can view all payment overrides" ON debt_payment_overrides;
DROP POLICY IF EXISTS "Coaches can view all savings goals" ON user_savings_goals;
DROP POLICY IF EXISTS "Coaches can view all profiles" ON profiles;

-- 2. Create optimized policies for Coach Access
-- We assume that the 'profiles' table has an RLS policy that allows users to view their OWN profile (id = auth.uid()).
-- This makes the subquery (SELECT 1 FROM profiles WHERE id = auth.uid() ...) safe.

-- Debts
CREATE POLICY "Coaches can view all debts" ON debts
    FOR SELECT
    USING (
        auth.uid() = user_id -- Own debts
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- Debt Settings
CREATE POLICY "Coaches can view all debt_settings" ON debt_settings
    FOR SELECT
    USING (
         auth.uid() = user_id -- Own settings
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- Completed Payments
CREATE POLICY "Coaches can view all completed payments" ON debt_completed_payments
    FOR SELECT
    USING (
         auth.uid() = user_id -- Own payments
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- Payment Overrides
CREATE POLICY "Coaches can view all payment overrides" ON debt_payment_overrides
    FOR SELECT
    USING (
         auth.uid() = user_id -- Own overrides
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- Savings Goals
CREATE POLICY "Coaches can view all savings goals" ON user_savings_goals
    FOR SELECT
    USING (
         auth.uid() = user_id -- Own goals
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- Profiles
-- Only add this if you are sure it doesn't conflict with existing "Users can view own profile" policies.
-- Ideally, Coaches should be able to see all 'coachee' profiles, which existing policies likely cover.
-- We will add a policy specifically for Coaches to see EVERYTHING if not already covered.
-- WARN: This might cause recursion if not careful, but usually 'id = auth.uid()' in the subquery breaks the loop.
CREATE POLICY "Coaches can view all profiles" ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );
