-- ============ 1. Fecha políticas permissivas (qualquer logado podia escrever) ============

-- Aulas: alunos leem, equipe da grade escreve
DROP POLICY IF EXISTS "Authenticated users can manage classes" ON public.classes;
CREATE POLICY "grade staff manage classes" ON public.classes FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'grade', 'edit'))
  WITH CHECK (public.can_module(auth.uid(), 'grade', 'edit'));

-- Atividades da grade
DROP POLICY IF EXISTS "Auth manage grade_activities" ON public.grade_activities;
CREATE POLICY "grade_activities read auth" ON public.grade_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "grade_activities staff write" ON public.grade_activities FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'gerencial', 'edit') OR public.can_module(auth.uid(), 'grade', 'edit'))
  WITH CHECK (public.can_module(auth.uid(), 'gerencial', 'edit') OR public.can_module(auth.uid(), 'grade', 'edit'));

-- Biblioteca de exercícios
DROP POLICY IF EXISTS "Authenticated users can manage exercise_library" ON public.exercise_library;
CREATE POLICY "exercise_library read auth" ON public.exercise_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "exercise_library staff write" ON public.exercise_library FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

-- Métodos de treino
DROP POLICY IF EXISTS "Authenticated users can manage training_methods" ON public.training_methods;
CREATE POLICY "training_methods read auth" ON public.training_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "training_methods staff write" ON public.training_methods FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

-- Modelos de treino
DROP POLICY IF EXISTS "Authenticated users can manage workout_templates" ON public.workout_templates;
CREATE POLICY "workout_templates staff manage" ON public.workout_templates FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage template_sessions" ON public.template_sessions;
CREATE POLICY "template_sessions staff manage" ON public.template_sessions FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can manage template_exercises" ON public.template_exercises;
CREATE POLICY "template_exercises staff manage" ON public.template_exercises FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

-- Presets de série
DROP POLICY IF EXISTS "Auth write presets" ON public.training_set_presets;
CREATE POLICY "presets staff write" ON public.training_set_presets FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));

-- Serviços (catálogo interno)
DROP POLICY IF EXISTS "Auth manage services" ON public.services;
CREATE POLICY "services staff read" ON public.services FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "services staff write" ON public.services FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'gerencial', 'edit')) WITH CHECK (public.can_module(auth.uid(), 'gerencial', 'edit'));

-- Formulários e rotinas operacionais
DROP POLICY IF EXISTS "Auth manage operational_forms" ON public.operational_forms;
CREATE POLICY "op_forms staff read" ON public.operational_forms FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "op_forms staff write" ON public.operational_forms FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'operacional', 'edit')) WITH CHECK (public.can_module(auth.uid(), 'operacional', 'edit'));

DROP POLICY IF EXISTS "Auth manage operational_form_submissions" ON public.operational_form_submissions;
CREATE POLICY "op_subs staff read" ON public.operational_form_submissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "op_subs staff write" ON public.operational_form_submissions FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Auth manage operational_routines" ON public.operational_routines;
CREATE POLICY "op_routines staff read" ON public.operational_routines FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "op_routines staff write" ON public.operational_routines FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'operacional', 'edit')) WITH CHECK (public.can_module(auth.uid(), 'operacional', 'edit'));

-- Automações
DROP POLICY IF EXISTS "Authenticated users can manage automations" ON public.automations;
CREATE POLICY "automations staff manage" ON public.automations FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'operacional', 'edit')) WITH CHECK (public.can_module(auth.uid(), 'operacional', 'edit'));

-- Check-ins de acesso
DROP POLICY IF EXISTS "Authenticated users can manage check_ins" ON public.check_ins;
CREATE POLICY "check_ins own read" ON public.check_ins FOR SELECT TO authenticated
  USING (client_id = public.current_client_id() OR public.is_staff(auth.uid()));
CREATE POLICY "check_ins staff write" ON public.check_ins FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- Cancelamentos
DROP POLICY IF EXISTS "Authenticated users can manage cancellations" ON public.cancellations;
CREATE POLICY "cancellations staff manage" ON public.cancellations FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()) AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid()))))
  WITH CHECK (public.is_staff(auth.uid()) AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid()))));

-- Configurações do sistema
DROP POLICY IF EXISTS "authenticated manage settings" ON public.app_settings;
CREATE POLICY "settings read auth" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.can_module(auth.uid(), 'configuracoes', 'edit')) WITH CHECK (public.can_module(auth.uid(), 'configuracoes', 'edit'));

-- ============ 2. Escala e trocas de plantão por unidade ============
DROP POLICY IF EXISTS "staff reads schedules" ON public.shift_schedules;
CREATE POLICY "staff reads schedules in unit" ON public.shift_schedules FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid()))));

DROP POLICY IF EXISTS "staff reads swaps" ON public.shift_swap_requests;
CREATE POLICY "staff reads swaps in unit" ON public.shift_swap_requests FOR SELECT TO authenticated
  USING (
    public.is_staff(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.shift_schedules s
       WHERE s.id = shift_swap_requests.schedule_id
         AND (s.unit_id IS NULL OR s.unit_id = ANY (public.allowed_unit_ids(auth.uid())))
    )
  );

-- ============ 3. Resumo do aluno restrito à unidade do funcionário ============
CREATE OR REPLACE FUNCTION public.student_quick_summary(_client_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _c record; _chk record; _score numeric; _readiness text; _plan record;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RETURN jsonb_build_object('error','forbidden'); END IF;
  SELECT * INTO _c FROM public.clients WHERE id = _client_id;
  IF _c IS NULL THEN RETURN jsonb_build_object('error','not_found'); END IF;
  IF _c.unit_id IS NOT NULL AND NOT (_c.unit_id = ANY (public.allowed_unit_ids(auth.uid()))) THEN
    RETURN jsonb_build_object('error','forbidden');
  END IF;

  SELECT * INTO _chk FROM public.daily_checkins
   WHERE client_id = _client_id AND checkin_date = (public.br_now())::date LIMIT 1;

  IF _chk.id IS NOT NULL THEN
    _score := (COALESCE(_chk.sleep_quality,3) + COALESCE(_chk.energy,3) + COALESCE(_chk.mood,3)) / 3.0
              + CASE WHEN COALESCE(_chk.sleep_hours,7) >= 7 THEN 0.5
                     WHEN COALESCE(_chk.sleep_hours,7) < 5 THEN -0.5 ELSE 0 END;
    _readiness := CASE WHEN _score >= 4 THEN 'alta' WHEN _score >= 2.8 THEN 'moderada' ELSE 'baixa' END;
  END IF;

  SELECT id, name, starts_at, expires_at INTO _plan FROM public.training_plans
   WHERE client_id = _client_id AND COALESCE(status,'ativo') = 'ativo'
   ORDER BY created_at DESC LIMIT 1;

  RETURN jsonb_build_object(
    'client', jsonb_build_object('id', _c.id, 'name', _c.name, 'avatar_url', _c.avatar_url,
       'visit_type', _c.visit_type, 'status', _c.status, 'objective', _c.objective,
       'limitations', _c.limitations, 'observations', _c.observations, 'plan', _c.plan),
    'is_trial', COALESCE(_c.visit_type,'') = 'experimental',
    'anamnesis', COALESCE((SELECT jsonb_agg(jsonb_build_object('type', a.type, 'content', a.content, 'created_at', a.created_at) ORDER BY a.created_at DESC)
        FROM public.anamnesis a WHERE a.client_id = _client_id), '[]'::jsonb),
    'pains', COALESCE((SELECT jsonb_agg(jsonb_build_object('created_at', p.created_at, 'region', p.region, 'level', p.level, 'notes', p.notes) ORDER BY p.created_at DESC)
        FROM (SELECT * FROM public.pain_reports WHERE client_id = _client_id ORDER BY created_at DESC LIMIT 5) p), '[]'::jsonb),
    'checkin', CASE WHEN _chk.id IS NULL THEN NULL ELSE jsonb_build_object(
        'sleep_hours', _chk.sleep_hours, 'sleep_quality', _chk.sleep_quality,
        'energy', _chk.energy, 'mood', _chk.mood) END,
    'readiness', COALESCE(_readiness, 'sem_checkin'),
    'training_plan', CASE WHEN _plan.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', _plan.id, 'name', _plan.name, 'starts_at', _plan.starts_at, 'expires_at', _plan.expires_at) END,
    'alerts', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', l.id, 'new_value', l.new_value, 'source', l.source,
          'created_at', l.created_at, 'acknowledged_at', l.acknowledged_at) ORDER BY l.created_at DESC)
        FROM public.limitation_alerts l WHERE l.client_id = _client_id AND l.acknowledged_at IS NULL), '[]'::jsonb)
  );
END; $function$;