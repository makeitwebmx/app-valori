-- =============================================================
-- FIX: Debt module RLS for coach impersonation (owner + linked coach)
-- =============================================================
-- Run in Supabase SQL Editor.
-- This allows:
-- 1) User managing own debt data
-- 2) Coach managing debt data ONLY for linked coachees

BEGIN;

-- 1) Helper function: can current auth user manage target user's debt data?
CREATE OR REPLACE FUNCTION public.can_manage_debt_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    actor_id UUID := auth.uid();
    actor_is_coach BOOLEAN := FALSE;
    linked_to_target BOOLEAN := FALSE;
BEGIN
    IF actor_id IS NULL OR target_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Owner access
    IF actor_id = target_user_id THEN
        RETURN TRUE;
    END IF;

    -- Must be a coach role (supports variants like coach_plus, Coach, etc.)
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = actor_id
          AND lower(coalesce(p.role, '')) LIKE 'coach%'
    ) INTO actor_is_coach;

    IF NOT actor_is_coach THEN
        RETURN FALSE;
    END IF;

    -- Must be linked to the target coachee (current + legacy relationship tables)
    SELECT (
        EXISTS (
            SELECT 1
            FROM public.coaching_relationships cr
            WHERE cr.coach_id = actor_id
              AND cr.coachee_id = target_user_id
              AND lower(coalesce(cr.status, 'active')) IN ('active', 'accepted', 'pending', 'pending_invite')
        )
        OR
        EXISTS (
            SELECT 1
            FROM public.coach_client_relationships ccr
            WHERE ccr.coach_id = actor_id
              AND ccr.client_id = target_user_id
              AND lower(coalesce(ccr.status, 'active')) IN ('active', 'accepted', 'pending', 'pending_invite')
        )
    ) INTO linked_to_target;

    RETURN linked_to_target;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_manage_debt_user(UUID) TO authenticated;

-- 2) Ensure RLS enabled
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_completed_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_payment_overrides ENABLE ROW LEVEL SECURITY;

-- 3) Drop all existing policies on debt tables (clean and deterministic)
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('debts', 'debt_settings', 'debt_completed_payments', 'debt_payment_overrides')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
    END LOOP;
END
$$;

-- 4) Recreate policies: owner or linked coach can SELECT/INSERT/UPDATE/DELETE
CREATE POLICY debts_owner_or_linked_coach_all
ON public.debts
FOR ALL
USING (public.can_manage_debt_user(user_id))
WITH CHECK (public.can_manage_debt_user(user_id));

CREATE POLICY debt_settings_owner_or_linked_coach_all
ON public.debt_settings
FOR ALL
USING (public.can_manage_debt_user(user_id))
WITH CHECK (public.can_manage_debt_user(user_id));

CREATE POLICY debt_completed_payments_owner_or_linked_coach_all
ON public.debt_completed_payments
FOR ALL
USING (public.can_manage_debt_user(user_id))
WITH CHECK (public.can_manage_debt_user(user_id));

CREATE POLICY debt_payment_overrides_owner_or_linked_coach_all
ON public.debt_payment_overrides
FOR ALL
USING (public.can_manage_debt_user(user_id))
WITH CHECK (public.can_manage_debt_user(user_id));

-- 5) Ensure table privileges exist for authenticated role
GRANT ALL ON public.debts TO authenticated;
GRANT ALL ON public.debt_settings TO authenticated;
GRANT ALL ON public.debt_completed_payments TO authenticated;
GRANT ALL ON public.debt_payment_overrides TO authenticated;

COMMIT;

