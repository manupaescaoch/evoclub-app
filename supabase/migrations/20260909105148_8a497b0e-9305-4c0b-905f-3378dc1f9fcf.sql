
-- Perfis padrão EVO CLUB
DO $$
DECLARE
  full_actions text[] := ARRAY['view','create','edit','delete','sensitive'];
BEGIN
  -- Acesso Total
  UPDATE public.permission_profiles SET
    description = 'Acesso completo a todos os módulos',
    status = 'active',
    modules = (
      SELECT jsonb_object_agg(m, to_jsonb(full_actions))
      FROM unnest(ARRAY['dashboard','clientes','grade','crm','financeiro','gerencial','treinos','avaliacao','equipe','operacional','ocorrencias','club','comunidade','configuracoes']) AS m
    )
  WHERE name = 'Acesso Total';

  -- Recepção
  UPDATE public.permission_profiles SET
    description = 'Atendimento, agendamentos e cadastro de alunos',
    status = 'active',
    modules = '{"dashboard":["view"],"clientes":["view","create","edit"],"grade":["view","create","edit"],"crm":["view","create","edit"],"ocorrencias":["view","create"],"club":["view","create"],"operacional":["view","create"]}'::jsonb
  WHERE name = 'Recepção';

  -- Financeiro
  UPDATE public.permission_profiles SET
    description = 'Gestão financeira da unidade',
    status = 'active',
    modules = '{"dashboard":["view"],"clientes":["view"],"financeiro":["view","create","edit","delete","sensitive"],"gerencial":["view"],"ocorrencias":["view"]}'::jsonb
  WHERE name = 'Financeiro';

  -- Estagiário
  UPDATE public.permission_profiles SET
    description = 'Acesso restrito de apoio ao treino',
    status = 'active',
    modules = '{"dashboard":["view"],"clientes":["view"],"treinos":["view"],"grade":["view"],"avaliacao":["view"]}'::jsonb
  WHERE name = 'Estagiário';

  -- Desativa perfis fora da nova lista
  UPDATE public.permission_profiles SET status = 'inactive'
  WHERE name IN ('Consultor','Coordenador de Vendas','Coordenador Técnico','Professor');
END $$;

INSERT INTO public.permission_profiles (name, description, status, modules)
SELECT v.name, v.description, 'active', v.modules::jsonb
FROM (VALUES
  ('Gerente', 'Gestão completa da unidade, exceto configurações do sistema',
   '{"dashboard":["view"],"clientes":["view","create","edit","delete"],"grade":["view","create","edit","delete"],"crm":["view","create","edit","delete"],"financeiro":["view","create","edit","sensitive"],"gerencial":["view","create","edit"],"treinos":["view","create","edit"],"avaliacao":["view","create","edit"],"equipe":["view","create","edit"],"operacional":["view","create","edit","delete"],"ocorrencias":["view","create","edit","delete"],"club":["view","create","edit"],"comunidade":["view","create","edit","delete"]}'),
  ('Coordenador Geral', 'Coordenação técnica e operacional de todas as equipes',
   '{"dashboard":["view"],"clientes":["view","create","edit"],"grade":["view","create","edit","delete"],"crm":["view","create","edit"],"treinos":["view","create","edit","delete"],"avaliacao":["view","create","edit"],"equipe":["view","create","edit"],"operacional":["view","create","edit"],"ocorrencias":["view","create","edit"],"comunidade":["view","create","edit"]}'),
  ('Coordenador de Turno', 'Coordenação do turno: grade, equipe presente e ocorrências',
   '{"dashboard":["view"],"clientes":["view","edit"],"grade":["view","create","edit"],"treinos":["view","create","edit"],"avaliacao":["view","create"],"equipe":["view"],"operacional":["view","create","edit"],"ocorrencias":["view","create","edit"],"comunidade":["view"]}'),
  ('Estagiário líder', 'Apoio de coordenação no turno com registro de treinos',
   '{"dashboard":["view"],"clientes":["view"],"grade":["view","edit"],"treinos":["view","create","edit"],"avaliacao":["view","create"],"operacional":["view","create"],"ocorrencias":["view","create"]}'),
  ('Comercial', 'Vendas, leads, indicações e conversões',
   '{"dashboard":["view"],"clientes":["view","create","edit"],"crm":["view","create","edit","delete"],"grade":["view"],"financeiro":["view"],"club":["view","create"]}'),
  ('Sócio / Administrador', 'Visão estratégica completa, incluindo dados sensíveis',
   '{"dashboard":["view"],"clientes":["view","create","edit","delete","sensitive"],"grade":["view","create","edit","delete"],"crm":["view","create","edit","delete","sensitive"],"financeiro":["view","create","edit","delete","sensitive"],"gerencial":["view","create","edit","delete","sensitive"],"treinos":["view","create","edit","delete"],"avaliacao":["view","create","edit","delete"],"equipe":["view","create","edit","delete","sensitive"],"operacional":["view","create","edit","delete"],"ocorrencias":["view","create","edit","delete"],"club":["view","create","edit","delete"],"comunidade":["view","create","edit","delete"],"configuracoes":["view","create","edit","delete","sensitive"]}')
) AS v(name, description, modules)
WHERE NOT EXISTS (SELECT 1 FROM public.permission_profiles p WHERE p.name = v.name);
