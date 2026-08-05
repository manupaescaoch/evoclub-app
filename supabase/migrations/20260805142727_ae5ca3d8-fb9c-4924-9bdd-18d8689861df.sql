CREATE TABLE public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id integer references public.clients(id) on delete set null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
ON public.push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Staff can view push subscriptions"
ON public.push_subscriptions FOR SELECT TO authenticated
USING (public.can_manage_training(auth.uid()));

CREATE TRIGGER trg_push_subscriptions_updated
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_push_subscriptions_client ON public.push_subscriptions(client_id) WHERE active;

CREATE TABLE public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  url text,
  target text not null default 'student',
  kind text not null default 'staff_message',
  client_id integer references public.clients(id) on delete set null,
  unit_id uuid references public.units(id) on delete set null,
  booking_id uuid references public.class_bookings(id) on delete set null,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT ON public.push_notifications TO authenticated;
GRANT ALL ON public.push_notifications TO service_role;
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view push notifications"
ON public.push_notifications FOR SELECT TO authenticated
USING (public.can_manage_training(auth.uid()));

CREATE POLICY "Staff can create push notifications"
ON public.push_notifications FOR INSERT TO authenticated
WITH CHECK (public.can_manage_training(auth.uid()));

CREATE UNIQUE INDEX idx_push_reminder_once
ON public.push_notifications(booking_id)
WHERE kind = 'class_reminder' AND booking_id IS NOT NULL;