-- Migration: Add entrepreneur_profile column to user_business_quiz_results
ALTER TABLE public.user_business_quiz_results 
ADD COLUMN IF NOT EXISTS entrepreneur_profile TEXT;

-- Comment on column
COMMENT ON COLUMN public.user_business_quiz_results.entrepreneur_profile IS 'Stores the calculated entrepreneur profile type (e.g., Empresario en Crecimiento) based on quiz score.';
