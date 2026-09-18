DROP POLICY IF EXISTS "Auth read session_ex" ON public.training_session_exercises;

DROP POLICY IF EXISTS "waitlist select" ON public.class_waitlist;
CREATE POLICY "waitlist select own or staff" ON public.class_waitlist
FOR SELECT TO authenticated
USING (client_id = public.current_client_id() OR public.can_manage_training(auth.uid()));