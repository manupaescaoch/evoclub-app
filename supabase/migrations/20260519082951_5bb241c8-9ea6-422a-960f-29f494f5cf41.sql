ALTER TABLE public.training_plans
ADD COLUMN IF NOT EXISTS starts_at date,
ADD COLUMN IF NOT EXISTS expires_at date;