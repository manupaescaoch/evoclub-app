
ALTER TABLE public.operational_routines
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'activity',
  ADD COLUMN IF NOT EXISTS day_of_week integer,
  ADD COLUMN IF NOT EXISTS message_template text,
  ADD COLUMN IF NOT EXISTS whatsapp_group_link text;

ALTER TABLE public.operational_forms
  ADD COLUMN IF NOT EXISTS fields jsonb NOT NULL DEFAULT '[]'::jsonb;
