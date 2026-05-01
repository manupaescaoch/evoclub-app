import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, ClipboardEdit } from "lucide-react";
import { Button } from "@/components/ui/button";

type Client = { id: number; name: string; phone: string | null; status: string | null; plan: string | null };

const PrescreverTreino = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("clients").select("id, name, phone, status, plan").order("name");
      setClients((data || []) as Client[]);
      setLoading(false);
    })();
  }, []);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone && c.phone.includes(search));
    const matchStatus = statusFilter === "Todos" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const initials = (n: string) => n.split(" ").map(x => x[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <ClipboardEdit className="text-primary" size={26} />
        <h1 className="font-barlow font-bold text-2xl text-foreground">PRESCREVER TREINO</h1>
      </div>
      <p className="text-sm text-muted-foreground font-dm mb-6">Selecione um aluno para criar ou editar o plano de treino.</p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno por nome ou telefone..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card rounded-xl border border-border font-dm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <select
            value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="text-sm font-dm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none"
          >
            <option>Todos</option>
            <option value="AT">Ativo</option>
            <option value="IN">Inativo</option>
            <option value="OP">Oportunidade</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Carregando alunos...</div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground font-dm">Nenhum aluno encontrado.</div>
          ) : filtered.map(c => (
            <div key={c.id}
              className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary/30 transition-all">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-barlow shrink-0">
                  {initials(c.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-dm font-bold text-foreground uppercase truncate">{c.name}</p>
                  {c.plan && <p className="text-[11px] font-dm text-muted-foreground truncate">{c.plan}</p>}
                </div>
              </div>
              <Button size="sm" className="font-dm text-xs shrink-0"
                onClick={() => navigate(`/admin/treinos/prescrever/${c.id}`)}>
                Selecionar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PrescreverTreino;