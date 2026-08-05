DROP INDEX IF EXISTS public.idx_push_reminder_once;

CREATE INDEX IF NOT EXISTS idx_push_notifications_reminder
ON public.push_notifications(kind, booking_id, created_at DESC);

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;