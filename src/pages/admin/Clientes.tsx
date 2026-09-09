import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, Camera, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { logCreate } from "@/lib/audit";
import { useUnit } from "@/contexts/UnitContext";
import { useAccess } from "@/contexts/AccessContext";
import { OverviewRow, useClientOverview } from "@/hooks/useClient360";
import Perfil360 from "@/components/admin/clientes/Perfil360";
import { SummaryCard } from "@/components/admin/gerencial/PageShell";
import { fmtDate } from "@/components/admin/clientes/Perfil360Tabs";

const statusMap: Record<string, { label: string; color: string }> = {
  AT: { label: "CL", color: "bg-green-100 text-green-700" },
  OP: { label: "OP", color: "bg-yellow-100 text-yellow-700" },
  SU: { label: "SU", color: "bg-gray-100 text-gray-600" },
  CA: { label: "CA", color: "bg-red-100 text-red-600" },
};

const finMap: Record<string, { label: string; color: string }> = {
  ok: { label: "Em dia", color: "bg-green-100 text-green-700" },
  expiring: { label: "A vencer", color: "bg-amber-100 text-amber-700" },
  overdue: { label: "Atraso", color: "bg-red-100 text-red-700" },
  blocked: { label: "Bloqueado", color: "bg-red-100 text-red-700" },
  na: { label: "Sem plano", color: "bg-gray-100 text-gray-600" },
};

const emptyForm = {
  firstName: "", lastName: "", gender: "", phone: "", email: "", visitType: "", observations: "",
};

const selectClass =
  "h-9 px-2 rounded-md border border-input bg-background text-xs font-dm text-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const Clientes = () => {
  const navigate = useNavigate();
  const { units, filterId } = useUnit();
  const { can, isAdmin } = useAccess();
  const canCreate = isAdmin || can("clientes", "create");
  const { rows, loading, error, reload } = useClientOverview(filterId);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todos" | "clientes" | "oportunidades">("todos");
  const [fVisit, setFVisit] = useState("");
  const [fPlan, setFPlan] = useState("");
  const [fFin, setFFin] = useState("");
  const [fPresence, setFPresence] = useState("");
  const [fPend, setFPend] = useState("");
  const [selected, setSelected] = useState<OverviewRow | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const plans = useMemo(
    () => Array.from(new Set(rows.map(r => r.plan).filter(Boolean))) as string[],
    [rows],
  );

  const filtered = useMemo(() => rows.filter(c => {
    const q = search.trim().toLowerCase();
    if (q && ![c.name, c.email, c.cpf, c.phone].some(v => (v || "").toLowerCase().includes(q))) return false;
    if (tab === "clientes" && c.status !== "AT") return false;
    if (tab === "oportunidades" && c.status !== "OP") return false;
    if (fVisit && c.visit_type !== fVisit) return false;
    if (fPlan && c.plan !== fPlan) return false;
    if (fFin && (c.financial_state || "na") !== fFin) return false;
    const d = c.days_since_activity;
    if (fPresence === "7" && !(d != null && d <= 7)) return false;
    if (fPresence === "30" && !(d != null && d <= 30)) return false;
    if (fPresence === "inactive" && !(d == null || d > 3)) return false;
    if (fPresence === "never" && d != null) return false;
    if (fPend === "training" && !c.training_overdue) return false;
    if (fPend === "assessment" && !c.assessment_overdue) return false;
    if (fPend === "occurrence" && !(c.open_occurrences || 0)) return false;
    if (fPend === "renewal" && !(c.pending_renewals || 0)) return false;
    if (fPend === "alert" && !(c.open_alerts || 0)) return false;
    return true;
  }), [rows, search, tab, fVisit, fPlan, fFin, fPresence, fPend]);

  const kpis = useMemo(() => ({
    total: filtered.length,
    ativos: filtered.filter(c => c.status === "AT").length,
    irregular: filtered.filter(c => ["overdue", "blocked"].includes(c.financial_state || "")).length,
    inativos: filtered.filter(c => (c.days_since_activity ?? 999) > 3).length,
  }), [filtered]);

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.gender || !form.phone || !form.email || !form.visitType) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    const fullName = `${form.firstName} ${form.lastName}`;
    const { data, error } = await supabase.from("clients").insert({
      name: fullName,
      email: form.email,
      phone: form.phone,
      status: "OP",
      gender: form.gender,
      visit_type: form.visitType,
      observations: form.observations || null,
      unit_id: filterId || units[0]?.id || null,
    } as any).select().single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      logCreate("client", (data as any)?.id, `Cadastrou cliente ${fullName}`,
        { email: form.email, phone: form.phone, visit_type: form.visitType },
        (data as any)?.unit_id ?? null, "clientes");
      toast.success("Cliente cadastrado com sucesso!");
      setForm(emptyForm);
      setShowDrawer(false);
      reload();
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h1 className="font-barlow font-bold text-2xl md:text-3xl text-foreground leading-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground font-dm mt-1">
            Base de alunos e oportunidades com perfil 360º, frequência e pendências.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" className="gap-2 font-dm flex-1 md:flex-none min-h-11" onClick={reload}>
            <RefreshCw size={15} /> ATUALIZAR
          </Button>
          {canCreate && (
            <Button className="gap-2 font-dm flex-1 md:flex-none min-h-11" onClick={() => setShowDrawer(true)}>
              <Plus size={16} /> NOVO CADASTRO
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <SummaryCard label="Resultados" value={kpis.total} />
        <SummaryCard label="Ativos" value={kpis.ativos} accent="green" />
        <SummaryCard label="Financeiro irregular" value={kpis.irregular} accent="red" />
        <SummaryCard label="+3 dias sem treinar" value={kpis.inativos} accent="yellow" />
      </div>

      {/* Busca e filtros */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 md:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquise por nome, e-mail, CPF ou telefone"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-11 md:h-9 font-dm"
          />
        </div>
        <div className="flex flex-wrap gap-2 min-w-0">
          <select value={fVisit} onChange={e => setFVisit(e.target.value)} className={selectClass}>
            <option value="">Todos os tipos</option>
            <option value="presencial">Presencial</option>
            <option value="online">Online</option>
            <option value="experimental">Experimental</option>
          </select>
          <select value={fPlan} onChange={e => setFPlan(e.target.value)} className={selectClass}>
            <option value="">Todos os planos</option>
            {plans.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={fFin} onChange={e => setFFin(e.target.value)} className={selectClass}>
            <option value="">Financeiro: todos</option>
            <option value="ok">Em dia</option>
            <option value="expiring">A vencer</option>
            <option value="overdue">Em atraso</option>
            <option value="blocked">Bloqueado</option>
            <option value="na">Sem plano</option>
          </select>
          <select value={fPresence} onChange={e => setFPresence(e.target.value)} className={selectClass}>
            <option value="">Presenças: todas</option>
            <option value="7">Treinou nos últimos 7 dias</option>
            <option value="30">Treinou nos últimos 30 dias</option>
            <option value="inactive">+3 dias sem treinar</option>
            <option value="never">Nunca treinou</option>
          </select>
          <select value={fPend} onChange={e => setFPend(e.target.value)} className={selectClass}>
            <option value="">Pendências: todas</option>
            <option value="training">Treino vencido</option>
            <option value="assessment">Avaliação vencida</option>
            <option value="occurrence">Ocorrência aberta</option>
            <option value="renewal">Renovação pendente</option>
            <option value="alert">Alerta de frequência</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex gap-5 md:gap-6 border-b border-border overflow-x-auto no-scrollbar momentum-scroll">
          {([["todos", "Todos"], ["clientes", "Clientes"], ["oportunidades", "Oportunidades"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2 shrink-0 min-h-11 text-sm font-dm font-medium transition-colors
                ${tab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-sm font-dm font-bold text-foreground shrink-0 whitespace-nowrap">{filtered.length} <span className="font-normal text-muted-foreground hidden sm:inline">resultados</span></span>
      </div>

      {/* Tabela */}
      <div className="bg-card rounded-xl card-shadow max-w-full table-scroll">
        <table className="w-full text-sm font-dm min-w-[840px]">
          <thead>
            <tr className="border-b border-border">
              {["Nome", "Plano", "Financeiro", "Última presença", "Treinos 30d", "Vencimento", "Pendências"].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted/30 rounded animate-pulse w-20" /></td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr><td colSpan={7} className="text-center py-12 text-red-600">Erro ao carregar: {error}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado</td></tr>
            ) : (
              filtered.map(c => {
                const st = statusMap[c.status || "OP"];
                const fin = finMap[c.financial_state || "na"];
                const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const pend: string[] = [];
                if (c.training_overdue) pend.push("Treino");
                if (c.assessment_overdue) pend.push("Avaliação");
                if (c.open_occurrences) pend.push("Ocorrência");
                if (c.pending_renewals) pend.push("Renovação");
                if (c.open_alerts) pend.push("Frequência");
                return (
                  <tr key={c.id} onClick={() => navigate(`/admin/clientes/${c.id}`)}
                    className="border-b border-border hover:bg-muted/10 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground overflow-hidden">
                          {c.avatar_url ? <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover" /> : initials}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{c.id}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                        </div>
                        <p className="font-medium text-foreground uppercase text-xs">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.plan || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-dm px-2 py-0.5 rounded-full ${fin.color}`}>{fin.label}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className={(c.days_since_activity ?? 999) > 3 ? "text-red-600" : "text-muted-foreground"}>
                        {c.last_activity ? `${fmtDate(c.last_activity)} · ${c.days_since_activity}d` : "nunca"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.workouts_30d ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(c.contract_end)}</td>
                    <td className="px-4 py-3">
                      {pend.length ? (
                        <div className="flex flex-wrap gap-1">
                          {pend.map(p => (
                            <span key={p} className="text-[10px] font-dm px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">{p}</span>
                          ))}
                        </div>
                      ) : <span className="text-[11px] text-green-700">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>


      {/* Drawer novo cadastro */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowDrawer(false)} />
          <div className="relative w-full md:w-[420px] bg-card h-full shadow-xl overflow-y-auto animate-in slide-in-from-right">
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-dm font-semibold text-lg text-foreground">Novo cadastro</h2>
              <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-4 bg-background rounded-xl p-4">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Camera size={20} className="text-muted-foreground" />
                </div>
                <button className="text-sm text-primary font-dm font-medium">Foto de perfil</button>
              </div>

              <div>
                <label className="text-sm font-dm text-foreground">Nome <span className="text-red-500">*</span></label>
                <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="mt-1" placeholder="Nome" />
              </div>

              <div>
                <label className="text-sm font-dm text-foreground">Sobrenome <span className="text-red-500">*</span></label>
                <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="mt-1" placeholder="Sobrenome" />
              </div>

              <div>
                <label className="text-sm font-dm text-foreground">Gênero <span className="text-red-500">*</span></label>
                <select
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Gênero *</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-dm text-foreground">DDI / Telefone Celular <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mt-1">
                  <div className="flex items-center gap-1 border border-input rounded-md px-3 h-10 bg-background text-sm font-dm text-foreground shrink-0">
                    +55 <span className="text-muted-foreground">▾</span>
                  </div>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Telefone Celular *" />
                </div>
              </div>

              <div>
                <label className="text-sm font-dm text-foreground">E-mail <span className="text-red-500">*</span></label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" placeholder="E-mail *" />
              </div>

              <div>
                <label className="text-sm font-dm text-foreground">Tipo de Visita <span className="text-red-500">*</span></label>
                <select
                  value={form.visitType}
                  onChange={e => setForm(f => ({ ...f, visitType: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Tipo de Visita *</option>
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="experimental">Experimental</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-dm text-foreground">Observações</label>
                <textarea
                  value={form.observations}
                  onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                  className="mt-1 w-full h-28 px-3 py-2 rounded-md border border-input bg-background text-sm font-dm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Descrição"
                />
              </div>
            </div>

            <div className="sticky bottom-0 bg-card border-t border-border p-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="font-dm">
                {saving ? "SALVANDO..." : "SALVAR"}
              </Button>
              <Button variant="ghost" onClick={() => setShowDrawer(false)} className="font-dm text-muted-foreground">
                CANCELAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
