CREATE OR REPLACE FUNCTION public.form_link_submit(p_token text, p_payload jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.form_links; v_text text;
BEGIN
  SELECT * INTO l FROM public.form_links WHERE token = p_token;
  IF l.id IS NULL THEN RETURN json_build_object('error','not_found'); END IF;
  IF l.answered_at IS NOT NULL THEN RETURN json_build_object('error','already_answered'); END IF;

  UPDATE public.form_links
     SET status = 'answered', answered_at = now(), response = p_payload
   WHERE id = l.id;

  IF l.kind = 'anamnese' THEN
    v_text := concat_ws(' · ',
      NULLIF('Objetivo: ' || COALESCE(p_payload->>'objective',''), 'Objetivo: '),
      NULLIF('Lesões: ' || COALESCE(p_payload->>'injuries',''), 'Lesões: '),
      NULLIF('Dores: ' || COALESCE(p_payload->>'pain',''), 'Dores: '),
      NULLIF('Limitações: ' || COALESCE(p_payload->>'limitations',''), 'Limitações: '),
      NULLIF('Restrições: ' || COALESCE(p_payload->>'restrictions',''), 'Restrições: '),
      NULLIF(p_payload->>'notes', '')
    );

    INSERT INTO public.anamnesis (client_id, unit_id, lead_name, phone, link_id, type, content,
      objective, training_history, injuries, pain, limitations, restrictions, sleep, stress, routine)
    VALUES (l.client_id, l.unit_id, l.lead_name, l.phone, l.id, 'anamnese',
      NULLIF(v_text, ''),
      p_payload->>'objective', p_payload->>'training_history', p_payload->>'injuries',
      p_payload->>'pain', p_payload->>'limitations', p_payload->>'restrictions',
      p_payload->>'sleep', p_payload->>'stress', p_payload->>'routine');

    IF l.client_id IS NOT NULL THEN
      UPDATE public.clients SET objective = COALESCE(NULLIF(p_payload->>'objective',''), objective),
             limitations = COALESCE(NULLIF(p_payload->>'limitations',''), limitations)
       WHERE id = l.client_id;
    END IF;
  ELSIF l.kind = 'nps' THEN
    INSERT INTO public.nps_responses (client_id, lead_name, unit_id, score, comment, source, link_id)
    VALUES (l.client_id, l.lead_name, l.unit_id,
            LEAST(10, GREATEST(0, COALESCE((p_payload->>'score')::int, 0))),
            p_payload->>'comment', 'link', l.id);
  ELSE
    INSERT INTO public.operational_form_submissions (form_id, unit_id, responsible_name, answers, notes, status)
    VALUES (l.form_id, l.unit_id, l.lead_name, p_payload, p_payload->>'notes', 'respondido');
  END IF;

  RETURN json_build_object('ok', true);
END; $$;
REVOKE ALL ON FUNCTION public.form_link_submit(text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.form_link_submit(text, jsonb) TO anon, authenticated;