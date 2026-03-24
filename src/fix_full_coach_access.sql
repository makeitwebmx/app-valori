-- Fix Full Coach Access (Debts + Savings)
-- Run this in Supabase SQL Editor

-- 1. Enable RLS (just in case)
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_completed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payment_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_data ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing Coach policies to avoid conflicts
DROP POLICY IF EXISTS "Coaches can view all debts" ON debts;
DROP POLICY IF EXISTS "Coaches can view all debt_settings" ON debt_settings;
DROP POLICY IF EXISTS "Coaches can view all completed payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Coaches can view all payment overrides" ON debt_payment_overrides;
DROP POLICY IF EXISTS "Coaches can view all savings_data" ON savings_data;

-- 3. Create Policies

-- DEBTS
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

-- DEBT SETTINGS
CREATE POLICY "Coaches can view all debt_settings" ON debt_settings
    FOR SELECT
    USING (
         auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- DEBT PAYMENTS
CREATE POLICY "Coaches can view all completed payments" ON debt_completed_payments
    FOR SELECT
    USING (
         auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- DEBT OVERRIDES
CREATE POLICY "Coaches can view all payment overrides" ON debt_payment_overrides
    FOR SELECT
    USING (
         auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- SAVINGS (Single Table)
CREATE POLICY "Coaches can view all savings_data" ON savings_data
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'coach'
        )
    );

-- Allow Coaches to see profiles (Non-recursive version using JWT)
DROP POLICY IF EXISTS "Coaches can view all profiles" ON profiles;
CREATE POLICY "Coaches can view all profiles" ON profiles
    FOR SELECT
    USING (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
        OR 
        id = auth.uid()
    );
