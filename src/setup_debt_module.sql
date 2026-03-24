-- ============================================
-- SETUP DEBT MODULE & COACH PERMISSIONS
-- ============================================
-- This script will:
-- 1. Create the necessary tables if they don't exist.
-- 2. Configure Row Level Security (RLS) for Users and Coaches.
-- 3. Fix the "relation does not exist" error.

-- ============================================
-- 1. TABLE CREATION (IF NOT EXISTS)
-- ============================================

CREATE TABLE IF NOT EXISTS debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    card_type VARCHAR(20) DEFAULT 'credito',
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    initial_balance DECIMAL(12, 2) NOT NULL,
    rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    min_payment DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_day INTEGER DEFAULT 1,
    start_date DATE DEFAULT CURRENT_DATE,
    priority INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT debts_user_id_idx UNIQUE (user_id, id)
);

CREATE TABLE IF NOT EXISTS debt_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    strategy VARCHAR(20) DEFAULT 'snowball',
    monthly_budget DECIMAL(12, 2) DEFAULT 0,
    start_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT debt_settings_user_unique UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS debt_completed_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    month_index INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT debt_completed_payments_unique UNIQUE (user_id, debt_id, month_index)
);

CREATE TABLE IF NOT EXISTS debt_payment_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    month_index INTEGER NOT NULL,
    additional_payment DECIMAL(12, 2) DEFAULT 0,
    under_payment DECIMAL(12, 2),
    new_expenses DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT debt_payment_overrides_unique UNIQUE (user_id, debt_id, month_index)
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_debts_user_id ON debts(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_settings_user ON debt_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_completed_payments_user ON debt_completed_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_debt_payment_overrides_user ON debt_payment_overrides(user_id);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_completed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_payment_overrides ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CONFIGURE PERMISSIONS (RLS)
-- ============================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own debts" ON debts;
DROP POLICY IF EXISTS "Coaches can view all debts" ON debts;
DROP POLICY IF EXISTS "Users can view their own settings" ON debt_settings;
DROP POLICY IF EXISTS "Coaches can view all debt_settings" ON debt_settings;
DROP POLICY IF EXISTS "Users can view their own completed payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Coaches can view all completed payments" ON debt_completed_payments;
DROP POLICY IF EXISTS "Users can view their own overrides" ON debt_payment_overrides;
DROP POLICY IF EXISTS "Coaches can view all payment overrides" ON debt_payment_overrides;

-- --- DEBTS ---
CREATE POLICY "Users and Coaches can view debts" ON debts
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

CREATE POLICY "Users can manage their own debts" ON debts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- --- SETTINGS ---
CREATE POLICY "Users and Coaches can view settings" ON debt_settings
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

CREATE POLICY "Users can manage their own settings" ON debt_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- --- COMPLETED PAYMENTS ---
CREATE POLICY "Users and Coaches can view payments" ON debt_completed_payments
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

CREATE POLICY "Users can manage their own payments" ON debt_completed_payments
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- --- OVERRIDES ---
CREATE POLICY "Users and Coaches can view overrides" ON debt_payment_overrides
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

CREATE POLICY "Users can manage their own overrides" ON debt_payment_overrides
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Check for user_savings_goals permissions too (Legacy compatibility)
CREATE TABLE IF NOT EXISTS user_savings_goals (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    goals_data JSONB,
    debts_data JSONB,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_savings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coaches can view all savings goals" ON user_savings_goals;
CREATE POLICY "Users and Coaches can view savings goals" ON user_savings_goals
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    );

-- Grant permissions to public/authenticated roles if needed (usually handled by default in Supabase but safe to ensure)
GRANT ALL ON debts TO authenticated;
GRANT ALL ON debt_settings TO authenticated;
GRANT ALL ON debt_completed_payments TO authenticated;
GRANT ALL ON debt_payment_overrides TO authenticated;
GRANT ALL ON user_savings_goals TO authenticated;
