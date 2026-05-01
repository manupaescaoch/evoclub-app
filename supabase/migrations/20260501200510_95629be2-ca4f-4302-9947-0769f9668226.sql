
-- ==================== CRM TASKS ====================
CREATE TABLE public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  title text NOT NULL,
  description text,
  responsible_name text,
  responsible_phone text,
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'todo',
  category text,
  due_date date,
  due_time time,
  created_by text,
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage crm_tasks" ON public.crm_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_crm_tasks_updated BEFORE UPDATE ON public.crm_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.crm_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
  user_name text,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage crm_task_comments" ON public.crm_task_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.crm_task_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_task_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage crm_task_checklist_items" ON public.crm_task_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_crm_task_checklist_updated BEFORE UPDATE ON public.crm_task_checklist_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== CRM INDICATIONS ====================
CREATE TABLE public.crm_indications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  indicator_student_id integer,
  indicator_name text NOT NULL,
  indicated_name text NOT NULL,
  indicated_phone text,
  indicated_lead_id uuid,
  indicated_student_id integer,
  origin text,
  status text NOT NULL DEFAULT 'registered',
  plan_contracted text,
  enrollment_date date,
  discount_percent numeric NOT NULL DEFAULT 5,
  discount_applied boolean NOT NULL DEFAULT false,
  affected_monthly_value numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_indications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage crm_indications" ON public.crm_indications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_crm_indications_updated BEFORE UPDATE ON public.crm_indications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== OPERATIONAL ROUTINES ====================
CREATE TABLE public.operational_routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  title text NOT NULL,
  routine_type text,
  responsible_name text,
  responsible_phone text,
  date date,
  time time,
  recurrence text,
  status text NOT NULL DEFAULT 'pending',
  description text,
  checklist_form_id uuid,
  notes text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operational_routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage operational_routines" ON public.operational_routines FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_operational_routines_updated BEFORE UPDATE ON public.operational_routines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================== OPERATIONAL FORMS ====================
CREATE TABLE public.operational_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  name text NOT NULL,
  type text,
  description text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operational_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage operational_forms" ON public.operational_forms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_operational_forms_updated BEFORE UPDATE ON public.operational_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.operational_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.operational_forms(id) ON DELETE CASCADE,
  unit_id uuid,
  responsible_name text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  attachments jsonb DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'submitted',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.operational_form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage operational_form_submissions" ON public.operational_form_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Default forms
INSERT INTO public.operational_forms (name, type, description) VALUES
  ('Checklist de Abertura', 'opening', 'Checklist diário de abertura da unidade'),
  ('Checklist de Fechamento', 'closing', 'Checklist diário de fechamento da unidade'),
  ('Vistoria de Insumos', 'inventory', 'Vistoria de estoque e insumos'),
  ('Limpeza', 'cleaning', 'Checklist de limpeza'),
  ('Manutenção', 'maintenance', 'Solicitação e registro de manutenção'),
  ('Formulário da Recepção', 'reception', 'Formulário interno da recepção'),
  ('Formulário dos Treinadores', 'trainers', 'Formulário interno dos treinadores'),
  ('Relatório de Encerramento de Turno', 'shift_end', 'Relatório de encerramento de turno'),
  ('Ocorrências Internas', 'incidents', 'Registro de ocorrências internas');

-- ==================== STAFF SCHEDULES ====================
CREATE TABLE public.staff_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid,
  month integer NOT NULL,
  year integer NOT NULL,
  date_label text,
  schedule_date date,
  weekend_number integer,
  trainer_name text,
  trainer_hours text DEFAULT '08h às 14h',
  reception_name text,
  reception_hours text DEFAULT '08h às 12h',
  cleaning_name text,
  cleaning_hours text DEFAULT '10h às 14h',
  security_name text,
  security_hours text DEFAULT '10h às 14h',
  is_holiday boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.staff_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth manage staff_schedules" ON public.staff_schedules FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_staff_schedules_updated BEFORE UPDATE ON public.staff_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
