import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import PageShell, { SummaryCard, EmptyState, LoadingState, StatusBadge } from "@/components/admin/gerencial/PageShell";
import { Button } from "@/components/ui/button";
import { CalendarClock, Clock, Trophy, ShieldCheck, UserCog, History } from "lucide-react";

type Row = {
  id: string; full_name: string; role_title: string | null; email: string | null;
  phone: string | null; unit_id: string | null; status: string | null;
  allow_consolidated: boolean | null; financial_release: boolean | null;
  supervisor_id: string | null; shift_start: string | null; shift_end: string | null;
};

export default function Equipe() {
  const { filterId, units } = useUnit();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(null);
      let q = supabase.from("collaborators").select("*").order("full_name");
      if (filterId) q = q.eq("unit_id", filterId);
      const { data, error: err } = await q;
      if (!alive) return;
      if (err) setError(err.message);
      setRows((data as Row[]) || []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [filterId]);

  const unitName = (id: string | null) => units.find(u => u.id === id)?.name || "—";
  const collabName = (id: string | null) => rows.find(r => r.id === id)?.full_name || "—";
  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return s ? rows.filter(r => r.full_name.toLowerCase().includes(s) || (r.role_title || "").toLowerCase().includes(s)) : rows;
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: rows.length,
    ativos: rows.filter(r => (r.status ?? "active") === "active").length,
    financeiro: rows.filter(r => r.financial_release).length,
    consolidado: rows.filter(r => r.allow_consolidated).length,
  }), [rows]);

  return (
    <PageShell
      title="Equipe"
      description="Colaboradores, escala, ponto e desempenho da operação."
      search={{ value: search, onChange: setSearch, placeholder: "Buscar colaborador ou cargo..." }}
      primaryAction={
        <Button asChild variant="outline" className="gap-2">
          <Link to="/admin/gerencial/colaboradores"><UserCog size={16} /> Cadastro de colaboradores</Link>
        </Button>
      }
      summary={
        <>
          <SummaryCard label="Colaboradores" value={stats.total} />
          <SummaryCard label="Ativos" value={stats.ativos} accent="green" />
          <SummaryCard label="Com liberação financeira" value={stats.financeiro} accent="blue" />
          <SummaryCard label="Visão consolidada" value={stats.consolidado} accent="yellow" />
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { to: "/admin/gerencial/colaboradores", icon: UserCog, title: "Colaboradores", desc: "Cadastro, unidade, turno fixo e supervisor." },
          { to: "/admin/equipe/escala", icon: CalendarClock, title: "Escala", desc: "Sábados, domingos, feriados e trocas de turno." },
          { to: "/admin/equipe/ponto", icon: Clock, title: "Ponto e Jornada", desc: "Foto, geolocalização e raio da unidade." },
          { to: "/admin/equipe/desempenho", icon: Trophy, title: "Desempenho", desc: "Score 0–100 e ranking de destaque." },
          { to: "/admin/gerencial/permissoes", icon: ShieldCheck, title: "Permissões", desc: "Perfis de acesso por módulo e ação." },
          { to: "/admin/equipe/historico", icon: History, title: "Histórico", desc: "Auditoria de colaboradores, ponto e escala." },
        ].map(c => (
          <Link key={c.to} to={c.to} className="bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors">
            <c.icon size={18} className="text-primary" />
            <p className="font-barlow font-bold text-base mt-2">{c.title}</p>
            <p className="text-xs text-muted-foreground font-dm">{c.desc}</p>
          </Link>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-dm text-red-700">
          Não foi possível carregar a equipe: {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? <LoadingState /> : list.length === 0 ? (
          <EmptyState message="Nenhum colaborador cadastrado nesta unidade." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-dm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Colaborador</th>
                  <th className="px-4 py-3">Cargo</th>
                  <th className="px-4 py-3">Unidade</th>
                  <th className="px-4 py-3">Turno fixo</th>
                  <th className="px-4 py-3">Supervisor</th>
                  <th className="px-4 py-3">Contato</th>
                  <th className="px-4 py-3">Permissões</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3">{r.role_title || "—"}</td>
                    <td className="px-4 py-3">{unitName(r.unit_id)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.shift_start ? `${r.shift_start.slice(0, 5)} – ${(r.shift_end || "").slice(0, 5)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.supervisor_id ? collabName(r.supervisor_id) : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.phone || r.email || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {r.financial_release && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px]">
                            <ShieldCheck size={11} /> Financeiro
                          </span>
                        )}
                        {r.allow_consolidated && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px]">Consolidado</span>
                        )}
                        {!r.financial_release && !r.allow_consolidated && <span className="text-xs text-muted-foreground">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status || "active"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
