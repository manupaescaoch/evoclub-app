-- ============ PARTNERS: contrato, contato, unidades, portal ============
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS unit_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS contract_starts_at date,
  ADD COLUMN IF NOT EXISTS contract_ends_at date,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS portal_token text,
  ADD COLUMN IF NOT EXISTS portal_token_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_last_seen_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS partners_portal_token_uniq
  ON public.partners (portal_token) WHERE portal_token IS NOT NULL;

-- ============ BENEFÍCIOS ============
CREATE TABLE IF NOT EXISTS public.partner_benefits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  label text NOT NULL,
  benefit_type text NOT NULL DEFAULT 'percent',
  value numeric(12,2),
  rules text,
  valid_from date,
  valid_until date,
  usage_limit integer,
  limit_period text NOT NULL DEFAULT 'month',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_benefits TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_benefits TO authenticated;
GRANT ALL ON public.partner_benefits TO service_role;
ALTER TABLE public.partner_benefits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Beneficios ativos sao publicos para leitura"
  ON public.partner_benefits FOR SELECT USING (active = true);
CREATE POLICY "Equipe gerencia beneficios"
  ON public.partner_benefits FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX IF NOT EXISTS partner_benefits_partner_idx ON public.partner_benefits (partner_id, active);

CREATE TRIGGER partner_benefits_updated_at
  BEFORE UPDATE ON public.partner_benefits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RESGATES: benefício, unidade, compra, validador ============
ALTER TABLE public.club_redemptions
  ADD COLUMN IF NOT EXISTS benefit_id uuid REFERENCES public.partner_benefits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS purchase_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS validated_by uuid,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';

CREATE INDEX IF NOT EXISTS club_redemptions_period_idx
  ON public.club_redemptions (redeemed_at, status);
CREATE INDEX IF NOT EXISTS club_redemptions_benefit_idx
  ON public.club_redemptions (benefit_id, student_id, redeemed_at);

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.club_limit_window_start(_period text, _ref timestamptz)
RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE lower(coalesce(_period,'month'))
    WHEN 'day'   THEN date_trunc('day', _ref)
    WHEN 'week'  THEN date_trunc('week', _ref)
    WHEN 'month' THEN date_trunc('month', _ref)
    WHEN 'year'  THEN date_trunc('year', _ref)
    ELSE '-infinity'::timestamptz
  END
$$;

CREATE OR REPLACE FUNCTION public.club_estimate_saving(_type text, _value numeric, _purchase numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT round(CASE lower(coalesce(_type,'percent'))
    WHEN 'percent'  THEN coalesce(_purchase,0) * coalesce(_value,0) / 100
    WHEN 'fixed'    THEN LEAST(coalesce(_value,0), COALESCE(NULLIF(_purchase,0), coalesce(_value,0)))
    WHEN 'courtesy' THEN COALESCE(NULLIF(_purchase,0), coalesce(_value,0))
    ELSE coalesce(_value,0)
  END, 2)
$$;

-- ============ VALIDAÇÃO / REGISTRO DE RESGATE ============
CREATE OR REPLACE FUNCTION public.club_benefit_check(_student_id uuid, _benefit_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; used integer; win timestamptz; today date := (public.br_now())::date;
BEGIN
  SELECT pb.*, p.name AS partner_name, p.active AS partner_active,
         p.contract_ends_at, p.contract_starts_at
    INTO b FROM public.partner_benefits pb
    JOIN public.partners p ON p.id = pb.partner_id
   WHERE pb.id = _benefit_id;
  IF b.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'Benefício não encontrado'); END IF;
  IF NOT b.active OR NOT b.partner_active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Benefício inativo');
  END IF;
  IF b.valid_from IS NOT NULL AND today < b.valid_from THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Benefício ainda não vigente');
  END IF;
  IF b.valid_until IS NOT NULL AND today > b.valid_until THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Benefício vencido');
  END IF;
  IF b.contract_ends_at IS NOT NULL AND today > b.contract_ends_at THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Contrato do parceiro vencido');
  END IF;

  win := public.club_limit_window_start(b.limit_period, public.br_now());
  SELECT count(*) INTO used FROM public.club_redemptions r
   WHERE r.student_id = _student_id AND r.benefit_id = b.id
     AND r.status <> 'cancelled' AND r.redeemed_at >= win;

  IF b.usage_limit IS NOT NULL AND used >= b.usage_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason',
      format('Limite de uso atingido (%s por %s)', b.usage_limit,
        CASE lower(b.limit_period) WHEN 'day' THEN 'dia' WHEN 'week' THEN 'semana'
             WHEN 'month' THEN 'mês' WHEN 'year' THEN 'ano' ELSE 'total' END),
      'used', used, 'usage_limit', b.usage_limit);
  END IF;

  RETURN jsonb_build_object('ok', true, 'used', used, 'usage_limit', b.usage_limit,
    'benefit_type', b.benefit_type, 'value', b.value, 'label', b.label,
    'partner_name', b.partner_name, 'limit_period', b.limit_period);
END $$;

CREATE OR REPLACE FUNCTION public.club_redeem(
  _student_id uuid, _benefit_id uuid,
  _purchase_amount numeric DEFAULT NULL, _unit_id uuid DEFAULT NULL,
  _source text DEFAULT 'admin', _confirmed_by text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE chk jsonb; b record; saved numeric; new_id uuid;
BEGIN
  IF NOT (public.is_staff(auth.uid()) OR auth.uid() = _student_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'Sem permissão para registrar resgate');
  END IF;
  chk := public.club_benefit_check(_student_id, _benefit_id);
  IF NOT (chk->>'ok')::boolean THEN RETURN chk; END IF;

  SELECT pb.*, p.id AS pid INTO b FROM public.partner_benefits pb
    JOIN public.partners p ON p.id = pb.partner_id WHERE pb.id = _benefit_id;

  saved := public.club_estimate_saving(b.benefit_type, b.value, _purchase_amount);

  INSERT INTO public.club_redemptions (
    student_id, partner_id, benefit_id, benefit_label, unit_id,
    purchase_amount, amount_saved, status, confirmed_at, confirmed_by, validated_by, source
  ) VALUES (
    _student_id, b.pid, b.id, b.label, _unit_id,
    _purchase_amount, saved, 'confirmed', now(), _confirmed_by, auth.uid(), coalesce(_source,'admin')
  ) RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'redemption_id', new_id, 'amount_saved', saved,
    'benefit_label', b.label, 'used', (chk->>'used')::int + 1, 'usage_limit', b.usage_limit);
END $$;

-- ============ ADMIN: DASHBOARD + ALERTAS ============
CREATE OR REPLACE FUNCTION public.club_dashboard(
  _unit_id uuid DEFAULT NULL, _from date DEFAULT NULL, _to date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE f date := coalesce(_from, date_trunc('month', public.br_now())::date);
        t date := coalesce(_to, (public.br_now())::date);
        res jsonb;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;

  WITH r AS (
    SELECT cr.*, p.name AS partner_name, p.category
      FROM public.club_redemptions cr
      LEFT JOIN public.partners p ON p.id = cr.partner_id
     WHERE cr.status = 'confirmed'
       AND cr.redeemed_at::date BETWEEN f AND t
       AND (_unit_id IS NULL OR cr.unit_id = _unit_id)
  )
  SELECT jsonb_build_object(
    'from', f, 'to', t,
    'redemptions', (SELECT count(*) FROM r),
    'unique_students', (SELECT count(DISTINCT student_id) FROM r),
    'total_saved', (SELECT coalesce(sum(amount_saved),0) FROM r),
    'total_purchase', (SELECT coalesce(sum(purchase_amount),0) FROM r),
    'avg_saved', (SELECT coalesce(round(avg(amount_saved),2),0) FROM r),
    'active_partners', (SELECT count(*) FROM public.partners WHERE active),
    'partner_ranking', (
      SELECT coalesce(jsonb_agg(x ORDER BY (x->>'redemptions')::int DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'partner_id', partner_id, 'partner_name', coalesce(partner_name,'Parceiro'),
          'category', category, 'redemptions', count(*),
          'students', count(DISTINCT student_id),
          'total_saved', coalesce(sum(amount_saved),0)
        ) AS x
        FROM r GROUP BY partner_id, partner_name, category
      ) s
    ),
    'daily', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'day'), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('day', redeemed_at::date, 'redemptions', count(*),
                                  'total_saved', coalesce(sum(amount_saved),0)) AS x
        FROM r GROUP BY redeemed_at::date
      ) s
    )
  ) INTO res;
  RETURN res;
END $$;

CREATE OR REPLACE FUNCTION public.club_alerts(_days integer DEFAULT 30)
RETURNS TABLE (
  kind text, partner_id uuid, partner_name text, benefit_id uuid,
  label text, expires_at date, days_left integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 'contract'::text, p.id, p.name, NULL::uuid, 'Contrato do parceiro'::text, p.contract_ends_at,
         (p.contract_ends_at - (public.br_now())::date)::integer
    FROM public.partners p
   WHERE public.is_staff(auth.uid()) AND p.active AND p.contract_ends_at IS NOT NULL
     AND p.contract_ends_at <= (public.br_now())::date + _days
  UNION ALL
  SELECT 'benefit'::text, p.id, p.name, pb.id, pb.label, pb.valid_until,
         (pb.valid_until - (public.br_now())::date)::integer
    FROM public.partner_benefits pb
    JOIN public.partners p ON p.id = pb.partner_id
   WHERE public.is_staff(auth.uid()) AND pb.active AND pb.valid_until IS NOT NULL
     AND pb.valid_until <= (public.br_now())::date + _days
  ORDER BY 6
$$;

-- ============ PORTAL DO PARCEIRO (link com token) ============
CREATE OR REPLACE FUNCTION public.partner_portal_rotate(_partner_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tok text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  tok := replace(encode(gen_random_bytes(24), 'base64'), '/', '_');
  tok := replace(replace(tok, '+', '-'), '=', '');
  UPDATE public.partners SET portal_token = tok, portal_token_at = now() WHERE id = _partner_id;
  RETURN tok;
END $$;

CREATE OR REPLACE FUNCTION public.partner_portal_open(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p record; res jsonb;
BEGIN
  SELECT * INTO p FROM public.partners WHERE portal_token = p_token AND portal_token IS NOT NULL;
  IF p.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'Link inválido ou revogado'); END IF;

  UPDATE public.partners SET portal_last_seen_at = now() WHERE id = p.id;

  SELECT jsonb_build_object(
    'ok', true,
    'partner', jsonb_build_object(
      'id', p.id, 'name', p.name, 'category', p.category, 'active', p.active,
      'contact_name', p.contact_name, 'location', p.location,
      'contract_starts_at', p.contract_starts_at, 'contract_ends_at', p.contract_ends_at,
      'contract_days_left', CASE WHEN p.contract_ends_at IS NULL THEN NULL
                                 ELSE p.contract_ends_at - (public.br_now())::date END
    ),
    'benefits', (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'id', pb.id, 'label', pb.label, 'benefit_type', pb.benefit_type, 'value', pb.value,
        'rules', pb.rules, 'valid_from', pb.valid_from, 'valid_until', pb.valid_until,
        'usage_limit', pb.usage_limit, 'limit_period', pb.limit_period, 'active', pb.active
      ) ORDER BY pb.label), '[]'::jsonb)
      FROM public.partner_benefits pb WHERE pb.partner_id = p.id
    ),
    'totals', (
      SELECT jsonb_build_object(
        'redemptions', count(*),
        'students', count(DISTINCT cr.student_id),
        'total_saved', coalesce(sum(cr.amount_saved),0),
        'total_purchase', coalesce(sum(cr.purchase_amount),0),
        'month_redemptions', count(*) FILTER (WHERE cr.redeemed_at >= date_trunc('month', public.br_now())),
        'month_saved', coalesce(sum(cr.amount_saved) FILTER (WHERE cr.redeemed_at >= date_trunc('month', public.br_now())),0)
      ) FROM public.club_redemptions cr
       WHERE cr.partner_id = p.id AND cr.status = 'confirmed'
    ),
    'redemptions', (
      SELECT coalesce(jsonb_agg(x ORDER BY x->>'redeemed_at' DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'id', cr.id, 'redeemed_at', cr.redeemed_at,
          'benefit_label', coalesce(cr.benefit_label, 'Benefício'),
          'purchase_amount', cr.purchase_amount, 'amount_saved', cr.amount_saved,
          'student', coalesce(split_part(cm.name, ' ', 1), 'Aluno EVO'),
          'member_code', cm.member_code
        ) AS x
        FROM public.club_redemptions cr
        LEFT JOIN public.club_members cm ON cm.student_id = cr.student_id
        WHERE cr.partner_id = p.id AND cr.status = 'confirmed'
        ORDER BY cr.redeemed_at DESC LIMIT 200
      ) s
    )
  ) INTO res;
  RETURN res;
END $$;

GRANT EXECUTE ON FUNCTION public.partner_portal_open(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.club_redeem(uuid, uuid, numeric, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_benefit_check(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_dashboard(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_alerts(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.partner_portal_rotate(uuid) TO authenticated;