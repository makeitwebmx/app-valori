-- Create Savings Data Table (Single Source of Truth)
CREATE TABLE IF NOT EXISTS public.savings_data (
    user_id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.savings_data ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can manage their own savings data" ON public.savings_data
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

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

