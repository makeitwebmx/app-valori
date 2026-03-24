-- Create table for storing Business Quiz Results
create table if not exists public.user_business_quiz_results (
  user_id uuid references auth.users not null primary key,
  quiz_data jsonb,
  score numeric,
  last_updated timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS
alter table public.user_business_quiz_results enable row level security;

-- Policies
create policy "Users can view own business quiz results"
  on public.user_business_quiz_results for select
  using ( auth.uid() = user_id );

create policy "Users can insert own business quiz results"
  on public.user_business_quiz_results for insert
  with check ( auth.uid() = user_id );

create policy "Users can update own business quiz results"
  on public.user_business_quiz_results for update
  using ( auth.uid() = user_id );
