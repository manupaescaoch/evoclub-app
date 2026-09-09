
CREATE OR REPLACE FUNCTION public.retro_body(_client_id integer, _from date, _to date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_first uuid; v_last uuid; v_bio jsonb; v_measures jsonb;
BEGIN
  IF NOT public.retro_can_read(_client_id) THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  SELECT id INTO v_first FROM public.physical_assessments
   WHERE client_id = _client_id AND performed_at IS NOT NULL
     AND performed_at::date BETWEEN _from AND _to
   ORDER BY performed_at ASC LIMIT 1;

  SELECT id INTO v_last FROM public.physical_assessments
   WHERE client_id = _client_id AND performed_at IS NOT NULL
     AND performed_at::date BETWEEN _from AND _to
   ORDER BY performed_at DESC LIMIT 1;

  IF v_first IS NULL OR v_last IS NULL OR v_first = v_last THEN
    RETURN jsonb_build_object('allowed', true, 'bio', NULL, 'measures', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
           'first', to_jsonb(f) - 'id' - 'assessment_id' - 'created_at' - 'updated_at' - 'origin',
           'last',  to_jsonb(l) - 'id' - 'assessment_id' - 'created_at' - 'updated_at' - 'origin')
    INTO v_bio
    FROM public.assessment_bioimpedance f, public.assessment_bioimpedance l
   WHERE f.assessment_id = v_first AND l.assessment_id = v_last;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('key', m.measure_key, 'first', m.first_v, 'last', m.last_v)), '[]'::jsonb)
    INTO v_measures
    FROM (
      SELECT a.measure_key,
             MAX(CASE WHEN a.assessment_id = v_first THEN a.value END) AS first_v,
             MAX(CASE WHEN a.assessment_id = v_last  THEN a.value END) AS last_v
        FROM public.assessment_measures a
       WHERE a.assessment_id IN (v_first, v_last)
       GROUP BY a.measure_key
    ) m
   WHERE m.first_v IS NOT NULL AND m.last_v IS NOT NULL;

  RETURN jsonb_build_object('allowed', true, 'bio', v_bio, 'measures', COALESCE(v_measures, '[]'::jsonb));
END $$;

REVOKE ALL ON FUNCTION public.retro_body(integer, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retro_body(integer, date, date) TO authenticated, service_role;

-- Preenche a evolução corporal dentro do snapshot já gerado (sem recalcular o resto).
CREATE OR REPLACE FUNCTION public.retro_body_fill(_retro_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE r public.retrospectives; v_body jsonb;
BEGIN
  SELECT * INTO r FROM public.retrospectives WHERE id = _retro_id;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Retrospectiva não encontrada'; END IF;
  IF NOT public.retro_can_read(r.client_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF r.status IN ('enviada','visualizada','renovacao_iniciada','renovado','nao_renovado') THEN
    RETURN r.snapshot;
  END IF;

  v_body := public.retro_body(r.client_id, r.period_from, r.period_to);

  UPDATE public.retrospectives
     SET snapshot = jsonb_set(
           COALESCE(snapshot, '{}'::jsonb), '{assessments}',
           COALESCE(snapshot->'assessments', '{}'::jsonb)
             || jsonb_build_object('bio', v_body->'bio', 'measures', COALESCE(v_body->'measures','[]'::jsonb)),
           true),
         updated_at = now()
   WHERE id = _retro_id
   RETURNING snapshot INTO v_body;

  RETURN v_body;
END $$;

REVOKE ALL ON FUNCTION public.retro_body_fill(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retro_body_fill(uuid) TO authenticated, service_role;
