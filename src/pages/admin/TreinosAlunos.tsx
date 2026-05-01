import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, MoreVertical, ClipboardEdit, Eye, Dumbbell, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type Client = {
  id: number;
  name: string;
  phone: string | null;
  status: string | null;
  plan: string | null;
};

const TreinosAlunos = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("clients").select("id, name, phone, status, plan").order("name");
      setClients((data || []) as Client[]);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.phone && c.phone.includes(search));
    const matchStatus = statusFilter === "Todos" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "AT": return <span className="bg-green-100 text-green-700 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full">Ativo</span>;
      case "IN": return <span className="bg-gray-100 text-gray-600 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full">Inativo</span>;
      case "OP": return <span className="bg-blue-100 text-blue-600 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full">Oportunidade</span>;
      default: return <span className="bg-gray-100 text-gray-500 text-[10px] font-dm font-bold px-2 py-0.5 rounded-full">{status || "—"}</span>;
    }
  };

  const avatarColor = "bg-primary/10 text-primary";

  return (
    <div>
      <h1 className="font-barlow font-bold text-2xl text-foreground mb-1">ALUNOS</h1>
      <p className="text-sm text-muted-foreground font-dm mb-6">Gerencie treinos dos alunos</p>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar aluno..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-card rounded-xl border border-border font-dm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-sm font-dm bg-card border border-border rounded-lg px-3 py-2 focus:outline-none"
          >
            <option>Todos</option>
            <option value="AT">Ativo</option>
            <option value="IN">Inativo</option>
            <option value="OP">Oportunidade</option>
          </select>
        </div>
      </div>

      {/* Client list */}
      {loading ? (
        <div className="h-64 flex items-center justify-center text-muted-foreground font-dm">Carregando alunos...</div>
      ) : (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground font-dm">Nenhum aluno encontrado.</div>
          ) : (
            filtered.map((c, i) => (
              <div
                key={c.id}
                className="bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div
                  onClick={() => navigate(`/admin/treinos/alunos/${c.id}`)}
                  className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold font-barlow ${avatarColor}`}>
                    {initials(c.name)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-dm font-bold text-foreground uppercase">{c.name}</p>
                      {getStatusBadge(c.status)}
                    </div>
                    {c.phone && (
                      <p className="text-[11px] font-dm text-muted-foreground mt-0.5">📞 {c.phone}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="font-dm text-xs gap-1 hidden sm:inline-flex"
                    onClick={() => navigate(`/admin/treinos/prescrever/${c.id}`)}>
                    <ClipboardEdit size={13} /> Prescrever
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 hover:bg-muted rounded">
                        <MoreVertical size={16} className="text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="font-dm">
                      <DropdownMenuItem onClick={() => navigate(`/admin/treinos/alunos/${c.id}`)}>
                        <Eye className="w-4 h-4 mr-2" /> Ver perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/treinos/prescrever/${c.id}`)}>
                        <ClipboardEdit className="w-4 h-4 mr-2" /> Prescrever treino
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/treinos/alunos/${c.id}`)}>
                        <Dumbbell className="w-4 h-4 mr-2" /> Ver treino ativo
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/treinos/alunos/${c.id}`)}>
                        <History className="w-4 h-4 mr-2" /> Histórico
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default TreinosAlunos;
