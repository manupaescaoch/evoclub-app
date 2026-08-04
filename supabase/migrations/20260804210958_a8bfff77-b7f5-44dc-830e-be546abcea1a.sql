-- PARTNERS
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Lifestyle',
  tag text,
  discount_label text,
  location text,
  image_url text,
  description text,
  redeem_instructions text,
  code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_public_read" ON public.partners FOR SELECT USING (active = true);
CREATE POLICY "partners_staff_all" ON public.partners FOR ALL TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));
CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLUB MEMBERS (cartão do aluno)
CREATE TABLE public.club_members (
  student_id uuid PRIMARY KEY,
  member_code text NOT NULL UNIQUE,
  name text,
  unit text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.club_members TO authenticated;
GRANT ALL ON public.club_members TO service_role;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_members_own_select" ON public.club_members FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.can_manage_training(auth.uid()));
CREATE POLICY "club_members_own_insert" ON public.club_members FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());
CREATE POLICY "club_members_own_update" ON public.club_members FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR public.can_manage_training(auth.uid()))
  WITH CHECK (student_id = auth.uid() OR public.can_manage_training(auth.uid()));
CREATE TRIGGER trg_club_members_updated BEFORE UPDATE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CLUB REDEMPTIONS
CREATE TABLE public.club_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  amount_saved numeric,
  status text NOT NULL DEFAULT 'pending',
  confirmed_by text,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_club_redemptions_student ON public.club_redemptions(student_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_redemptions TO authenticated;
GRANT ALL ON public.club_redemptions TO service_role;
ALTER TABLE public.club_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_redemptions_select" ON public.club_redemptions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR public.can_manage_training(auth.uid()));
CREATE POLICY "club_redemptions_student_insert" ON public.club_redemptions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND status = 'pending' AND amount_saved IS NULL AND confirmed_by IS NULL AND confirmed_at IS NULL);
CREATE POLICY "club_redemptions_staff_insert" ON public.club_redemptions FOR INSERT TO authenticated
  WITH CHECK (public.can_manage_training(auth.uid()));
CREATE POLICY "club_redemptions_staff_update" ON public.club_redemptions FOR UPDATE TO authenticated
  USING (public.can_manage_training(auth.uid())) WITH CHECK (public.can_manage_training(auth.uid()));
CREATE POLICY "club_redemptions_staff_delete" ON public.club_redemptions FOR DELETE TO authenticated
  USING (public.can_manage_training(auth.uid()));
CREATE TRIGGER trg_club_redemptions_updated BEFORE UPDATE ON public.club_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();