CREATE TABLE IF NOT EXISTS public.partner_portal_access (
  partner_id uuid PRIMARY KEY REFERENCES public.partners(id) ON DELETE CASCADE,
  token text UNIQUE,
  token_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_portal_access TO authenticated;
GRANT ALL ON public.partner_portal_access TO service_role;
ALTER TABLE public.partner_portal_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppa_staff_all" ON public.partner_portal_access;
CREATE POLICY "ppa_staff_all" ON public.partner_portal_access FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.partner_portal_access (partner_id, token, token_at)
SELECT id, portal_token, portal_token_at FROM public.partners WHERE portal_token IS NOT NULL
ON CONFLICT (partner_id) DO NOTHING;

ALTER TABLE public.partners DROP COLUMN IF EXISTS portal_token;
ALTER TABLE public.partners DROP COLUMN IF EXISTS portal_token_at;

CREATE OR REPLACE FUNCTION public.partner_portal_rotate(_partner_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE tok text;
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  tok := replace(encode(gen_random_bytes(24), 'base64'), '/', '_');
  tok := replace(replace(tok, '+', '-'), '=', '');
  INSERT INTO public.partner_portal_access (partner_id, token, token_at)
  VALUES (_partner_id, tok, now())
  ON CONFLICT (partner_id) DO UPDATE SET token = EXCLUDED.token, token_at = now();
  RETURN tok;
END $function$;

CREATE OR REPLACE FUNCTION public.partner_portal_open(p_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE p record; res jsonb;
BEGIN
  SELECT pt.* INTO p FROM public.partners pt
    JOIN public.partner_portal_access ppa ON ppa.partner_id = pt.id
   WHERE ppa.token = p_token AND p_token IS NOT NULL;
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
END $function$;

-- parceiros: leitura pública passa a exigir login
DROP POLICY IF EXISTS "partners_public_read" ON public.partners;
CREATE POLICY "partners_auth_read" ON public.partners FOR SELECT TO authenticated USING (active = true);
DROP POLICY IF EXISTS "Beneficios ativos sao publicos para leitura" ON public.partner_benefits;
CREATE POLICY "partner_benefits_auth_read" ON public.partner_benefits FOR SELECT TO authenticated USING (active = true);