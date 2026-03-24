-- Create portfolios table
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_amount NUMERIC DEFAULT 0,
    investment_type TEXT,
    liquid NUMERIC DEFAULT 0,
    others JSONB DEFAULT '[]'::jsonb,
    expenses_2026 JSONB DEFAULT '[]'::jsonb,
    expenses_2027 JSONB DEFAULT '[]'::jsonb,
    savings_plan JSONB DEFAULT '{}'::jsonb,
    investment_distribution JSONB DEFAULT '{}'::jsonb,
    projections JSONB DEFAULT '[]'::jsonb,
    objectives JSONB DEFAULT '[]'::jsonb,
    real_distribution JSONB DEFAULT '{}'::jsonb,
    executed_investments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to select their own portfolio
CREATE POLICY "Users can view their own portfolio" ON public.portfolios
    FOR SELECT USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own portfolio
CREATE POLICY "Users can insert their own portfolio" ON public.portfolios
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own portfolio
CREATE POLICY "Users can update their own portfolio" ON public.portfolios
    FOR UPDATE USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own portfolio
CREATE POLICY "Users can delete their own portfolio" ON public.portfolios
    FOR DELETE USING (auth.uid() = user_id);
