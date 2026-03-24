-- Enable RLS on savings_data if not already enabled
ALTER TABLE public.savings_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to keep this script idempotent
DROP POLICY IF EXISTS "Users can manage own savings data" ON public.savings_data;
DROP POLICY IF EXISTS "Coaches can manage all savings data" ON public.savings_data;
DROP POLICY IF EXISTS "Coaches can view all savings_data" ON public.savings_data;

-- Users can manage their own savings data
CREATE POLICY "Users can manage own savings data" ON public.savings_data
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Coaches can manage all savings data
CREATE POLICY "Coaches can manage all savings data" ON public.savings_data
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND lower(profiles.role) LIKE 'coach%'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
              AND lower(profiles.role) LIKE 'coach%'
        )
    );
