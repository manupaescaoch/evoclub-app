import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Search, ShieldAlert } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

type Row = {
  id: string;
  created_at: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  description: string;
  unit_id: string | null;
  metadata: any;
  ip: string | null;
  user_agent: string | null;
};

const ACTION_STYLES: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-gray-100 text-gray-700",
  logout: "bg-gray-100 text-gray-500",
  custom: "bg-purple-100 text-purple-700",
};

const ACTION_LABEL: Record<string, string> = {
  create: "Criou", update: "Editou", delete: "Excluiu",
  login: "Entrou", logout: "Saiu", custom: "Ação",
};

const PAGE_SIZE = 50;

export default function AuditLogTab() {
  const { roles, loading: loadingRole } = useUserRole();
  const canView = roles.some(r => r === "admin" || r === "coordinator");

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Row | null>(null);

  const today = new Date();
  const priorDate = new Date(today);
  priorDate.setDate(today.getDate() - 30);
  const [from, setFrom] = useState<string>(priorDate.toISOString().slice(0, 10));
  const [to, setTo] = useState<string>(today.toISOString().slice(0, 10));
  const [action, setAction] = useState<string>("");
  const [entity, setEntity] = useState<string>("");
  const [user, setUser] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (action) query = query.eq("action", action);
    if (entity) query = query.eq("entity", entity);
    if (user) query = query.ilike("user_name", `%${user}%`);
    if (q) query = query.ilike("description", `%${q}%`);
    const { data, count } = await query;
    setRows((data as Row[]) || []);
    setTotal(count || 0);
    setLoading(false);
  };

  useEffect(() => { if (canView) load(); /* eslint-disable-next-line */ }, [canView, from, to, action, entity, user, q, page]);

  const entityOptions = useMemo(() => {
    const set = new Set(rows.map(r => r.entity));
    return Array.from(set).sort();
  }, [rows]);

  const exportCsv = () => {
    const header = ["Data/Hora", "Usuário", "E-mail", "Ação", "Entidade", "ID", "Descrição"];
    const lines = rows.map(r => [
      new Date(r.created_at).toLocaleString("pt-BR"),
      r.user_name || "",
      r.user_email || "",
      ACTION_LABEL[r.action] || r.action,
      r.entity,
      r.entity_id || "",
      (r.description || "").replaceAll('"', '""'),
    ].map(v => `"${v}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `auditoria-${from}-a-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loadingRole) return <div className="p-6 text-sm text-muted-foreground font-dm">Carregando…</div>;

  if (!canView) {
    return (
      <div className="bg-card rounded-xl card-shadow p-8 flex flex-col items-center text-center">
        <ShieldAlert size={32} className="text-muted-foreground mb-2" />
        <p className="font-barlow font-bold text-lg">Sem permissão</p>
        <p className="text-sm text-muted-foreground font-dm">Apenas administradores e coordenadores podem acessar a auditoria.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-card rounded-xl card-shadow p-4 grid grid-cols-2 md:grid-cols-6 gap-3">
        <div><Label className="text-xs">De</Label><Input type="date" value={from} onChange={e => { setPage(0); setFrom(e.target.value); }} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={to} onChange={e => { setPage(0); setTo(e.target.value); }} /></div>
        <div>
          <Label className="text-xs">Ação</Label>
          <select value={action} onChange={e => { setPage(0); setAction(e.target.value); }} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todas</option>
            <option value="create">Criou</option>
            <option value="update">Editou</option>
            <option value="delete">Excluiu</option>
            <option value="login">Entrou</option>
            <option value="logout">Saiu</option>
            <option value="custom">Ação</option>
          </select>
        </div>
        <div>
          <Label className="text-xs">Entidade</Label>
          <select value={entity} onChange={e => { setPage(0); setEntity(e.target.value); }} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Todas</option>
            {entityOptions.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div><Label className="text-xs">Usuário</Label><Input value={user} onChange={e => { setPage(0); setUser(e.target.value); }} placeholder="Nome" /></div>
        <div>
          <Label className="text-xs">Buscar</Label>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => { setPage(0); setQ(e.target.value); }} placeholder="Descrição" className="pl-8" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs font-dm text-muted-foreground">{total} registro(s)</p>
        <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5"><Download size={14} /> Exportar CSV</Button>
      </div>

      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-dm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-3 py-2 text-muted-foreground font-medium">Data/Hora</th>
                <th className="px-3 py-2 text-muted-foreground font-medium">Usuário</th>
                <th className="px-3 py-2 text-muted-foreground font-medium">Ação</th>
                <th className="px-3 py-2 text-muted-foreground font-medium">Entidade</th>
                <th className="px-3 py-2 text-muted-foreground font-medium">Descrição</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Carregando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum registro no período</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} onClick={() => setSelected(r)} className="border-b border-border hover:bg-muted/20 cursor-pointer">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium text-foreground">{r.user_name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{r.user_email}</p>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${ACTION_STYLES[r.action] || "bg-gray-100 text-gray-700"}`}>
                      {ACTION_LABEL[r.action] || r.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{r.entity}</td>
                  <td className="px-3 py-2">{r.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex justify-between items-center text-xs font-dm">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Anterior</Button>
          <span>Página {page + 1} de {Math.ceil(total / PAGE_SIZE)}</span>
          <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detalhes do registro</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3 text-xs font-dm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-muted-foreground">Data/Hora</p><p>{new Date(selected.created_at).toLocaleString("pt-BR")}</p></div>
                <div><p className="text-muted-foreground">Usuário</p><p>{selected.user_name} ({selected.user_email})</p></div>
                <div><p className="text-muted-foreground">Ação</p><p>{ACTION_LABEL[selected.action] || selected.action}</p></div>
                <div><p className="text-muted-foreground">Entidade</p><p>{selected.entity} {selected.entity_id ? `#${selected.entity_id}` : ""}</p></div>
              </div>
              <div><p className="text-muted-foreground">Descrição</p><p>{selected.description}</p></div>
              {selected.user_agent && <div><p className="text-muted-foreground">User agent</p><p className="break-all">{selected.user_agent}</p></div>}
              <div>
                <p className="text-muted-foreground mb-1">Metadados</p>
                <pre className="bg-muted/30 rounded p-2 overflow-auto max-h-64 text-[11px]">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}