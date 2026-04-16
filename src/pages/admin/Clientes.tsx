import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

type Client = {
  id: number;
  name: string;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  status: string | null;
  plan: string | null;
  plan_value: number | null;
  contract_start: string | null;
  contract_end: string | null;
  created_at: string | null;
};

const statusMap: Record<string, { label: string; color: string }> = {
  AT: { label: "ATIVO", color: "bg-green-100 text-green-700" },
  OP: { label: "OPORTUNIDADE", color: "bg-yellow-100 text-yellow-700" },
  SU: { label: "SUSPENSO", color: "bg-gray-100 text-gray-600" },
  CA: { label: "CANCELADO", color: "bg-red-100 text-red-600" },
};

const Clientes = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todos" | "clientes" | "oportunidades">("todos");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      setClients((data as Client[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (tab === "clientes") return matchSearch && c.status === "AT";
    if (tab === "oportunidades") return matchSearch && c.status === "OP";
    return matchSearch;
  });

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-barlow font-bold text-2xl text-foreground">CLIENTES</h1>
        <Button className="gap-2 font-dm"><Plus size={16} /> NOVO CADASTRO</Button>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-4 border-b border-border">
          {([["todos", "Todos"], ["clientes", "Clientes"], ["oportunidades", "Oportunidades"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2 text-sm font-dm font-medium transition-colors
                ${tab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-dm">{filtered.length} resultados</span>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <table className="w-full text-sm font-dm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Nome</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Contrato</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Cadastro</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Vencimento</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Status</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted/30 rounded animate-pulse w-20" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado</td></tr>
            ) : (
              filtered.map(c => {
                const st = statusMap[c.status || "OP"];
                const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold font-barlow">{initials}</div>
                        <div>
                          <p className="font-medium text-foreground">{c.name}</p>
                          <p className="text-[11px] text-muted-foreground">#{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.plan || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(c.contract_end)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${st.color}`}>{st.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.status === "OP" && (
                        <Button size="sm" variant="outline" className="text-xs h-7 font-dm text-primary border-primary">CONVERTER</Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Clientes;
