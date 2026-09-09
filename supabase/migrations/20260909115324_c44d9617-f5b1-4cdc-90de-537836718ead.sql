
-- ============ CONSENTIMENTOS ============
CREATE TABLE public.retro_consents (
  client_id integer PRIMARY KEY,
  allow_photos boolean NOT NULL DEFAULT false,
  allow_public_share boolean NOT NULL DEFAULT false,
  ranking_opt_out boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.retro_consents TO authenticated;
GRANT ALL ON public.retro_consents TO service_role;
ALTER TABLE public.retro_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retro_consents_staff_all" ON public.retro_consents FOR ALL TO authenticated
USING (public.can_module(auth.uid(), 'clientes', 'view'))
WITH CHECK (public.can_module(auth.uid(), 'clientes', 'edit'));

CREATE POLICY "retro_consents_student_read" ON public.retro_consents FOR SELECT TO authenticated
USING (client_id = public.current_client_id());
CREATE POLICY "retro_consents_student_insert" ON public.retro_consents FOR INSERT TO authenticated
WITH CHECK (client_id = public.current_client_id());
CREATE POLICY "retro_consents_student_update" ON public.retro_consents FOR UPDATE TO authenticated
USING (client_id = public.current_client_id())
WITH CHECK (client_id = public.current_client_id());

-- ============ RETROSPECTIVAS ============
CREATE TABLE public.retrospectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id integer NOT NULL,
  unit_id uuid,
  period_kind text NOT NULL DEFAULT 'contrato',
  period_from date NOT NULL,
  period_to date NOT NULL,
  status text NOT NULL DEFAULT 'aguardando',
  trigger text,
  snapshot jsonb,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  hidden_cards text[] NOT NULL DEFAULT '{}',
  card_order text[] NOT NULL DEFAULT '{}',
  custom_texts jsonb NOT NULL DEFAULT '{}'::jsonb,
  team_message text,
  team_message_kind text DEFAULT 'texto',
  team_message_url text,
  team_message_by uuid,
  team_message_name text,
  next_cycle jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz,
  reviewed_by uuid,
  reviewed_by_name text,
  reviewed_at timestamptz,
  sent_at timestamptz,
  sent_channel text,
  first_viewed_at timestamptz,
  views integer NOT NULL DEFAULT 0,
  renewal_outcome text,
  renewal_request_id uuid,
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX retrospectives_client_idx ON public.retrospectives (client_id, created_at DESC);
CREATE INDEX retrospectives_unit_idx ON public.retrospectives (unit_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.retrospectives TO authenticated;
GRANT ALL ON public.retrospectives TO service_role;
ALTER TABLE public.retrospectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retro_staff_select" ON public.retrospectives FOR SELECT TO authenticated
USING (
  public.can_module(auth.uid(), 'clientes', 'view')
  AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid())))
);
CREATE POLICY "retro_staff_insert" ON public.retrospectives FOR INSERT TO authenticated
WITH CHECK (
  public.can_module(auth.uid(), 'clientes', 'create')
  AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid())))
);
CREATE POLICY "retro_staff_update" ON public.retrospectives FOR UPDATE TO authenticated
USING (
  public.can_module(auth.uid(), 'clientes', 'edit')
  AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid())))
)
WITH CHECK (
  public.can_module(auth.uid(), 'clientes', 'edit')
  AND (unit_id IS NULL OR unit_id = ANY (public.allowed_unit_ids(auth.uid())))
);
CREATE POLICY "retro_admin_delete" ON public.retrospectives FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "retro_student_select" ON public.retrospectives FOR SELECT TO authenticated
USING (
  client_id = public.current_client_id()
  AND status IN ('enviada', 'visualizada', 'renovacao_iniciada', 'renovado', 'nao_renovado')
);

-- ============ LINKS DE COMPARTILHAMENTO ============
CREATE TABLE public.retro_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retrospective_id uuid NOT NULL REFERENCES public.retrospectives(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked_at timestamptz,
  allow_photos boolean NOT NULL DEFAULT false,
  allow_health boolean NOT NULL DEFAULT false,
  social_mode boolean NOT NULL DEFAULT false,
  views integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX retro_share_retro_idx ON public.retro_share_links (retrospective_id);

GRANT SELECT, INSERT, UPDATE ON public.retro_share_links TO authenticated;
GRANT ALL ON public.retro_share_links TO service_role;
ALTER TABLE public.retro_share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retro_share_staff_all" ON public.retro_share_links FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.retrospectives r WHERE r.id = retrospective_id
        AND public.can_module(auth.uid(), 'clientes', 'view')
        AND (r.unit_id IS NULL OR r.unit_id = ANY (public.allowed_unit_ids(auth.uid())))))
WITH CHECK (EXISTS (SELECT 1 FROM public.retrospectives r WHERE r.id = retrospective_id
        AND public.can_module(auth.uid(), 'clientes', 'edit')
        AND (r.unit_id IS NULL OR r.unit_id = ANY (public.allowed_unit_ids(auth.uid())))));

CREATE POLICY "retro_share_student_select" ON public.retro_share_links FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.retrospectives r WHERE r.id = retrospective_id AND r.client_id = public.current_client_id()));

-- ============ HISTÓRICO ============
CREATE TABLE public.retro_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retrospective_id uuid NOT NULL REFERENCES public.retrospectives(id) ON DELETE CASCADE,
  kind text NOT NULL,
  detail text,
  actor uuid,
  actor_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX retro_events_retro_idx ON public.retro_events (retrospective_id, created_at DESC);

GRANT SELECT ON public.retro_events TO authenticated;
GRANT ALL ON public.retro_events TO service_role;
ALTER TABLE public.retro_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retro_events_staff_select" ON public.retro_events FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.retrospectives r WHERE r.id = retrospective_id
        AND public.can_module(auth.uid(), 'clientes', 'view')
        AND (r.unit_id IS NULL OR r.unit_id = ANY (public.allowed_unit_ids(auth.uid())))));

-- ============ SELOS CONFIGURÁVEIS ============
CREATE TABLE public.retro_badge_rules (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  metric text NOT NULL,
  threshold numeric NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.retro_badge_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.retro_badge_rules TO authenticated;
GRANT ALL ON public.retro_badge_rules TO service_role;
ALTER TABLE public.retro_badge_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "retro_badges_read" ON public.retro_badge_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "retro_badges_write" ON public.retro_badge_rules FOR ALL TO authenticated
USING (public.can_module(auth.uid(), 'configuracoes', 'edit'))
WITH CHECK (public.can_module(auth.uid(), 'configuracoes', 'edit'));

INSERT INTO public.retro_badge_rules (code, label, description, metric, threshold, sort_order) VALUES
  ('workouts_10','Primeiros 10 treinos','Concluiu 10 treinos no período','workouts',10,10),
  ('workouts_50','50 treinos','Concluiu 50 treinos no período','workouts',50,20),
  ('workouts_100','100 treinos','Concluiu 100 treinos no período','workouts',100,30),
  ('workouts_200','200 treinos','Concluiu 200 treinos no período','workouts',200,40),
  ('consistent_1m','Um mês consistente','1 mês batendo a meta de frequência','months_goal_hit',1,50),
  ('consistent_3m','Três meses consistentes','3 meses batendo a meta de frequência','months_goal_hit',3,60),
  ('consistent_6m','Seis meses consistentes','6 meses batendo a meta de frequência','months_goal_hit',6,70),
  ('one_year','Um ano de EVO','12 meses ou mais como aluno','months_as_student',12,80),
  ('freq_80','Frequência acima de 80%','Cumpriu 80% ou mais da meta de frequência','frequency_pct',80,90),
  ('comeback','Retorno de destaque','Voltou a treinar após período de ausência','comebacks',1,100),
  ('streak_8w','Maior evolução','8 semanas seguidas em atividade','best_week_streak',8,110);

-- ============ TRIGGERS updated_at ============
CREATE TRIGGER retro_consents_updated BEFORE UPDATE ON public.retro_consents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER retrospectives_updated BEFORE UPDATE ON public.retrospectives
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER retro_badge_rules_updated BEFORE UPDATE ON public.retro_badge_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
