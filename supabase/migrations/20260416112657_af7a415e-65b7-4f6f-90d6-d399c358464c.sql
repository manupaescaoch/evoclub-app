
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('masculino','feminino','outro')),
ADD COLUMN IF NOT EXISTS visit_type text CHECK (visit_type IN ('presencial','online','experimental')),
ADD COLUMN IF NOT EXISTS observations text;
