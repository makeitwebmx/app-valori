
-- Create personal_banks table
CREATE TABLE IF NOT EXISTS public.personal_banks (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT personal_banks_pkey PRIMARY KEY (id),
  CONSTRAINT personal_banks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.personal_banks ENABLE ROW LEVEL SECURITY;

-- Create Policy for SELECT
CREATE POLICY "Users can view their own personal banks" ON public.personal_banks
  FOR SELECT USING (auth.uid() = user_id);

-- Create Policy for INSERT
CREATE POLICY "Users can insert their own personal banks" ON public.personal_banks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create Policy for UPDATE (optional but good practice)
CREATE POLICY "Users can update their own personal banks" ON public.personal_banks
  FOR UPDATE USING (auth.uid() = user_id);

-- Create Policy for DELETE (optional)
CREATE POLICY "Users can delete their own personal banks" ON public.personal_banks
  FOR DELETE USING (auth.uid() = user_id);
