-- Create table for storing monthly budget overrides
CREATE TABLE IF NOT EXISTS public.budget_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    budget_item_id UUID NOT NULL, -- Logical ID linking to the ideal budget item (concept)
    start_date DATE NOT NULL, -- The first day of the month this override applies to
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, budget_item_id, start_date)
);

-- RLS Policies
ALTER TABLE public.budget_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overrides" ON public.budget_overrides
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own overrides" ON public.budget_overrides
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overrides" ON public.budget_overrides
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides" ON public.budget_overrides
    FOR DELETE USING (auth.uid() = user_id);
