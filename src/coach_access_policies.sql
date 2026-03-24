-- Enable RLS on tables if not already enabled (good practice, though likely already on)
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_completed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payment_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ideal_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_client_relationships ENABLE ROW LEVEL SECURITY;

-- Helper: avoid RLS recursion when checking coach role
CREATE OR REPLACE FUNCTION public.is_coach()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM profiles
        WHERE id = auth.uid()
          AND lower(role) LIKE 'coach%'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_coach() TO authenticated;

-- Drop existing policies to make this script re-runnable
DROP POLICY IF EXISTS "Coaches can view all debts" ON debts;
DROP POLICY IF EXISTS "Coaches can view all debt_settings" ON debt_settings;
DROP POLICY IF EXISTS "Coaches can view all completed payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Coaches can view all payment overrides" ON debt_payment_overrides;
DROP POLICY IF EXISTS "Coaches can view all savings goals" ON user_savings_goals;
DROP POLICY IF EXISTS "Coaches can view all personal transactions" ON personal_transactions;
DROP POLICY IF EXISTS "Coaches can view all ideal budgets" ON user_ideal_budgets;
DROP POLICY IF EXISTS "Coaches can view all budget overrides" ON budget_overrides;
DROP POLICY IF EXISTS "Coaches can view all portfolios" ON portfolios;
DROP POLICY IF EXISTS "Users can manage own savings data" ON savings_data;
DROP POLICY IF EXISTS "Coaches can manage all savings data" ON savings_data;
DROP POLICY IF EXISTS "Coaches can view all business transactions" ON business_transactions;
DROP POLICY IF EXISTS "Coaches can view all business clients" ON business_clients;
DROP POLICY IF EXISTS "Coaches can view all business providers" ON business_providers;
DROP POLICY IF EXISTS "Coaches can view their relationships" ON coaching_relationships;
DROP POLICY IF EXISTS "Coachees can view their relationships" ON coaching_relationships;
DROP POLICY IF EXISTS "Coaches can manage their relationships" ON coaching_relationships;
DROP POLICY IF EXISTS "Coaches can view their relationships" ON coach_client_relationships;
DROP POLICY IF EXISTS "Coachees can view their relationships" ON coach_client_relationships;
DROP POLICY IF EXISTS "Coaches can manage their relationships" ON coach_client_relationships;
DROP POLICY IF EXISTS "Coaches can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- 1. Policies for 'debts' table
CREATE POLICY "Coaches can view all debts" ON debts
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 2. Policies for 'debt_settings' table
CREATE POLICY "Coaches can view all debt_settings" ON debt_settings
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 3. Policies for 'debt_completed_payments' table
CREATE POLICY "Coaches can view all completed payments" ON debt_completed_payments
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 4. Policies for 'debt_payment_overrides' table
CREATE POLICY "Coaches can view all payment overrides" ON debt_payment_overrides
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 5. Policies for 'user_savings_goals' table
CREATE POLICY "Coaches can view all savings goals" ON user_savings_goals
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 6. Policies for 'personal_transactions' table
CREATE POLICY "Coaches can view all personal transactions" ON personal_transactions
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 7. Policies for 'user_ideal_budgets' table
CREATE POLICY "Coaches can view all ideal budgets" ON user_ideal_budgets
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 8. Policies for 'budget_overrides' table
CREATE POLICY "Coaches can view all budget overrides" ON budget_overrides
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 9. Policies for 'portfolios' table
CREATE POLICY "Coaches can view all portfolios" ON portfolios
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 9.5 Policies for 'savings_data' table
CREATE POLICY "Users can manage own savings data" ON savings_data
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coaches can manage all savings data" ON savings_data
    FOR ALL
    USING (public.is_coach())
    WITH CHECK (public.is_coach());

-- 10. Policies for 'business_transactions' table
CREATE POLICY "Coaches can view all business transactions" ON business_transactions
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 11. Policies for 'business_clients' table
CREATE POLICY "Coaches can view all business clients" ON business_clients
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 12. Policies for 'business_providers' table
CREATE POLICY "Coaches can view all business providers" ON business_providers
    FOR SELECT
    USING (
        public.is_coach()
    );

-- 12.2 Policies for coaching relationships (current table)
CREATE POLICY "Coaches can view their relationships" ON coaching_relationships
    FOR SELECT
    USING (coach_id = auth.uid());

CREATE POLICY "Coachees can view their relationships" ON coaching_relationships
    FOR SELECT
    USING (coachee_id = auth.uid());

CREATE POLICY "Coaches can manage their relationships" ON coaching_relationships
    FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- 12.3 Policies for legacy coach_client_relationships
CREATE POLICY "Coaches can view their relationships" ON coach_client_relationships
    FOR SELECT
    USING (coach_id = auth.uid());

CREATE POLICY "Coachees can view their relationships" ON coach_client_relationships
    FOR SELECT
    USING (client_id = auth.uid());

CREATE POLICY "Coaches can manage their relationships" ON coach_client_relationships
    FOR ALL
    USING (coach_id = auth.uid())
    WITH CHECK (coach_id = auth.uid());

-- 12.5 Ensure any user can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 13. Ensure 'profiles' is readable by coaches (likely already is, but just in case)
CREATE POLICY "Coaches can view all profiles" ON profiles
    FOR SELECT
    USING (
        public.is_coach()
    );
