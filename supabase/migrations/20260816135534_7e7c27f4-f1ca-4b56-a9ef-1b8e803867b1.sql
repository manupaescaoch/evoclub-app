-- anamnesis: staff ou o próprio aluno
DROP POLICY IF EXISTS "Authenticated users can manage anamnesis" ON public.anamnesis;
CREATE POLICY "anamnesis_own_select" ON public.anamnesis FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.is_staff(auth.uid()));
CREATE POLICY "anamnesis_staff_write" ON public.anamnesis FOR ALL TO authenticated
  USING (public.can_module(auth.uid(),'clientes','edit') OR public.can_module(auth.uid(),'avaliacao','edit') OR public.can_manage_training(auth.uid()))
  WITH CHECK (public.can_module(auth.uid(),'clientes','edit') OR public.can_module(auth.uid(),'avaliacao','edit') OR public.can_manage_training(auth.uid()));

-- class_bookings: remove policy aberta (a policy do aluno já existe)
DROP POLICY IF EXISTS "Authenticated users can manage bookings" ON public.class_bookings;
CREATE POLICY "bookings_staff_all" ON public.class_bookings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.can_module(auth.uid(),'grade','edit') OR public.can_manage_training(auth.uid()));

-- workouts / sessions / exercises: dono ou staff
DROP POLICY IF EXISTS "Authenticated users can manage workouts" ON public.workouts;
CREATE POLICY "workouts_own_select" ON public.workouts FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.is_staff(auth.uid()));
CREATE POLICY "workouts_staff_write" ON public.workouts FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage workout_sessions" ON public.workout_sessions;
CREATE POLICY "wsessions_own_select" ON public.workout_sessions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id
     AND (w.client_id = public.current_client_id() OR public.is_staff(auth.uid()))));
CREATE POLICY "wsessions_staff_write" ON public.workout_sessions FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage workout_exercises" ON public.workout_exercises;
CREATE POLICY "wexercises_own_select" ON public.workout_exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.workouts w WHERE w.id = workout_id
     AND (w.client_id = public.current_client_id() OR public.is_staff(auth.uid()))));
CREATE POLICY "wexercises_staff_write" ON public.workout_exercises FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

-- units: leitura para autenticados, escrita só com permissão
DROP POLICY IF EXISTS "Authenticated users can manage units" ON public.units;
CREATE POLICY "units_select" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "units_write" ON public.units FOR ALL TO authenticated
  USING (public.can_module(auth.uid(),'configuracoes','edit') OR public.can_module(auth.uid(),'gerencial','edit'))
  WITH CHECK (public.can_module(auth.uid(),'configuracoes','edit') OR public.can_module(auth.uid(),'gerencial','edit'));

-- contracts: aluno lê apenas modelos ativos da sua unidade e do seu plano
DROP POLICY IF EXISTS "contracts student read" ON public.contracts;
CREATE POLICY "contracts student read" ON public.contracts FOR SELECT TO authenticated
  USING (status = 'active' AND EXISTS (
    SELECT 1 FROM public.clients c
     WHERE c.id = public.current_client_id()
       AND (contracts.unit_id IS NULL OR contracts.unit_id = c.unit_id)
       AND (contracts.linked_plan IS NULL OR contracts.linked_plan = c.plan)
  ));