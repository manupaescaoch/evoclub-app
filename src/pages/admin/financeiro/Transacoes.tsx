import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUnit } from "@/contexts/UnitContext";
import { fmtBRL, fmtBRLShort, monthName, monthFull, variation, todayISO } from "@/lib/finance";
import StatCard from "@/components/admin/StatCard";
import VarBadge from "@/components/admin/financeiro/VarBadge";
import TxFormDialog from "@/components/admin/financeiro/TxFormDialog";
import TxDetailSheet from "@/components/admin/financeiro/TxDetailSheet";
import TxImportDialog, { ImportKind } from "@/components/admin/financeiro/TxImportDialog";
import { useTransacoesLedger } from "@/hooks/useTransacoesLedger";
import {
  Tx, STATUS_FILTERS, PAYMENT_METHODS, effStatus, statusLabel, statusClass,
  competence, buildExportRows, downloadCsv, downloadXlsx, printPdf, isTransfer,
} from "@/lib/txUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus, Search, Filter, RefreshCw, Upload, Download, MoreVertical, ChevronLeft, ChevronRight,
  AlertTriangle, ArrowUpDown, X,
} from "lucide-react";
import { toast } from "sonner";
import { logAudit, logUpdate } from "@/lib/audit";
import { Link } from "react-router-dom";

type SortKey = "date" | "description" | "amount" | "category_name" | "status";

const selectCls = "h-9 rounded-lg border border-border bg-card px-2 text-xs font-dm";

const Transacoes = () => {
  const { filterId, units, isConsolidated } = useUnit();
  const [params] = useSearchParams();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const L = useTransacoesLedger(filterId, year, month);

  // filtros
  const [search, setSearch] = useState("");
  const [fKind, setFKind] = useState(params.get("kind") || "all");
  const [fGroup, setFGroup] = useState("all");
  const [fCat, setFCat] = useState(params.get("category") || "all");
  const [fStatus, setFStatus] = useState("all");
  const [fAccount, setFAccount] = useState("all");
  const [fMethod, setFMethod] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // modais
  const [formOpen, setFormOpen] = useState(false);
  const [formTx, setFormTx] = useState<Partial<Tx> | null>(null);
  const [detail, setDetail] = useState<Tx | null>(null);
  const [importKind, setImportKind] = useState<ImportKind | null>(null);
  const [confirmAsk, setConfirmAsk] = useState<{ title: string; desc: string; run: () => Promise<void> } | null>(null);
  const [syncing, setSyncing] = useState(false);

  const unitName = (id: string | null) => units.find((u) => u.id === id)?.name || "—";
  const groupName = (id: string | null) => L.groups.find((g) => g.id === id)?.name || "—";
  const accountName = (id: string | null) => L.accounts.find((a) => a.id === id)?.name || "Conta não informada";
  const supplierName = (id: string | null) => L.suppliers.find((s) => s.id === id)?.name || "—";
  const clientName = (id: number | null) => (id ? L.clients[id] || `#${id}` : "—");

  useEffect(() => { setPage(1); setSelected(new Set()); }, [search, fKind, fGroup, fCat, fStatus, fAccount, fMethod, year, month, filterId]);

  const catOptions = useMemo(
    () => L.categories.filter((c) => (fGroup === "all" || c.group_id === fGroup) && (fKind === "all" || !c.kind || c.kind === fKind)),
    [L.categories, fGroup, fKind],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return L.monthRows.filter((r) => {
      const st = effStatus(r);
      if (fKind !== "all" && r.kind !== fKind) return false;
      if (fGroup !== "all" && r.group_id !== fGroup) return false;
      if (fCat !== "all") {
        if (fCat === "none" ? !!(r.category_id || r.category_name) : r.category_name !== fCat) return false;
      }
      if (fStatus !== "all") {
        if (fStatus === "reconciled" && !r.reconciled) return false;
        if (fStatus === "unreconciled" && r.reconciled) return false;
        if (!["reconciled", "unreconciled"].includes(fStatus) && st !== fStatus) return false;
      }
      if (fAccount !== "all" && r.bank_account_id !== fAccount) return false;
      if (fMethod !== "all" && r.payment_method !== fMethod) return false;
      if (q) {
        const hay = [
          r.description, r.category_name, accountName(r.bank_account_id), r.payment_method,
          r.external_id, r.reference, r.stone_code, supplierName(r.supplier_id), clientName(r.client_id), r.id,
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [L.monthRows, search, fKind, fGroup, fCat, fStatus, fAccount, fMethod, L.accounts, L.suppliers, L.clients]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.key === "amount") return (Number(a.amount) - Number(b.amount)) * dir;
      if (sort.key === "status") return effStatus(a).localeCompare(effStatus(b)) * dir;
      const av = String((a as any)[sort.key] || "");
      const bv = String((b as any)[sort.key] || "");
      return av.localeCompare(bv, "pt-BR") * dir;
    });
    return arr;
  }, [filtered, sort]);

  const totalIn = filtered.filter((r) => r.kind === "income" && r.status !== "cancelled").reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = filtered.filter((r) => r.kind === "expense" && r.status !== "cancelled").reduce((s, r) => s + Number(r.amount), 0);
  const pageRows = sorted.slice((page - 1) * perPage, page * perPage);
  const pages = Math.max(1, Math.ceil(sorted.length / perPage));

  const activeFilters = [
    search && "busca", fKind !== "all" && "tipo", fGroup !== "all" && "grupo", fCat !== "all" && "categoria",
    fStatus !== "all" && "status", fAccount !== "all" && "conta", fMethod !== "all" && "forma",
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch(""); setFKind("all"); setFGroup("all"); setFCat("all");
    setFStatus("all"); setFAccount("all"); setFMethod("all");
  };

  // ---------- ações ----------
  const patch = async (ids: string[], values: Record<string, any>, msg: string) => {
    const { error } = await supabase.from("transactions").update(values).in("id", ids);
    if (error) { toast.error(error.message); return; }
    ids.forEach((id) => logUpdate("transaction", id, msg, values, filterId, "financeiro"));
    toast.success(msg);
    setSelected(new Set());
    L.reload();
  };

  const markPaid = (ids: string[]) => patch(ids, { status: "paid", paid_at: todayISO() }, "Marcado como pago");
  const markPending = (ids: string[]) => patch(ids, { status: "pending", paid_at: null }, "Marcado como pendente");
  const reconcile = (ids: string[]) => patch(ids, { reconciled: true }, "Conciliado");

  const duplicate = async (r: Tx) => {
    const { id, created_at, updated_at, external_id, recurrence_group, ...rest } = r as any;
    const { error } = await supabase.from("transactions").insert({
      ...rest, external_id: null, recurrence_group: null, reconciled: false, source: "manual", status: "pending", paid_at: null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Lançamento duplicado"); L.reload(); }
  };

  const refund = (r: Tx) =>
    setConfirmAsk({
      title: "Estornar lançamento?",
      desc: `${r.description} — ${fmtBRL(Number(r.amount))}. O valor passa a ser contabilizado como estorno.`,
      run: async () => {
        await patch([r.id], { status: "refunded" }, "Lançamento estornado");
        logAudit({ action: "custom", entity: "transaction", entity_id: r.id, description: `Estorno: ${r.description}`, module: "financeiro", unit_id: r.unit_id });
      },
    });

  const remove = (r: Tx) =>
    setConfirmAsk({
      title: "Excluir lançamento?",
      desc: r.source !== "manual" || r.reconciled
        ? "Este lançamento foi importado ou conciliado: ele será arquivado e o histórico preservado."
        : `${r.description} — ${fmtBRL(Number(r.amount))}.`,
      run: async () => {
        const { error } = await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", r.id);
        if (error) { toast.error(error.message); return; }
        logAudit({ action: "delete", entity: "transaction", entity_id: r.id, description: `Lançamento excluído: ${r.description}`, module: "financeiro", unit_id: r.unit_id, before: r as any });
        toast.success("Lançamento excluído");
        L.reload();
      },
    });

  // ---------- sincronizar banco ----------
  const syncBank = async () => {
    const configured = L.accounts.filter((a) => a.provider);
    if (!configured.length) {
      toast.error("Nenhuma integração bancária configurada", {
        description: "Cadastre a conta e o provedor em Financeiro › Configurações.",
      });
      return;
    }
    if (!filterId) { toast.error("Selecione uma unidade específica para sincronizar"); return; }
    setSyncing(true);
    const ids = configured.map((a) => a.id);
    const { data: bt, error } = await supabase
      .from("bank_transactions")
      .select("id,bank_account_id,unit_id,posted_at,amount,direction,description,bank_ref,payment_method")
      .in("bank_account_id", ids)
      .is("match_id", null)
      .eq("unit_id", filterId)
      .limit(1000);
    if (error) { toast.error(error.message); setSyncing(false); return; }
    const existing = new Set(
      L.rows.map((r) => `${r.date}|${Number(r.amount).toFixed(2)}|${r.bank_account_id || ""}|${(r.description || "").toLowerCase().slice(0, 40)}`),
    );
    const extIds = new Set(L.rows.map((r) => r.external_id).filter(Boolean));
    const news = (bt || []).filter((b: any) => {
      if (b.bank_ref && extIds.has(b.bank_ref)) return false;
      const key = `${b.posted_at}|${Math.abs(Number(b.amount)).toFixed(2)}|${b.bank_account_id}|${(b.description || "").toLowerCase().slice(0, 40)}`;
      return !existing.has(key);
    });
    let ok = 0;
    if (news.length) {
      const { data, error: e2 } = await supabase.from("transactions").insert(
        news.map((b: any) => ({
          unit_id: b.unit_id, date: b.posted_at, due_date: b.posted_at, paid_at: b.posted_at,
          description: b.description || "Lançamento bancário",
          kind: b.direction === "credit" || Number(b.amount) > 0 ? "income" : "expense",
          amount: Math.abs(Number(b.amount)), status: "paid", bank_account_id: b.bank_account_id,
          payment_method: b.payment_method, external_id: b.bank_ref, source: "bank", reconciled: false,
        })),
      ).select("id");
      if (e2) { toast.error(e2.message); setSyncing(false); return; }
      ok = (data || []).length;
    }
    await supabase.from("bank_accounts").update({ last_sync_at: new Date().toISOString() }).in("id", ids);
    setSyncing(false);
    toast.success(ok ? `${ok} novos lançamentos importados do banco` : "Nenhum lançamento novo no banco");
    L.reload();
  };

  const lastSync = L.accounts
    .map((a) => a.last_sync_at)
    .filter(Boolean)
    .sort()
    .pop();

  // ---------- exportação ----------
  const exportRows = () => buildExportRows(sorted, unitName, groupName, accountName);
  const fileName = `transacoes-${year}-${String(month + 1).padStart(2, "0")}`;
  const doExport = (type: "csv" | "xlsx" | "pdf") => {
    if (!sorted.length) { toast.error("Nada para exportar com os filtros atuais"); return; }
    const rows = exportRows();
    if (type === "csv") downloadCsv(rows, fileName);
    else if (type === "xlsx") downloadXlsx(rows, fileName);
    else if (!printPdf(rows, "Transações — EVO CLUB", `${monthFull(month)} de ${year} · ${isConsolidated ? "Consolidado" : unitName(filterId)}`))
      toast.error("Libere a janela pop-up para gerar o PDF");
  };

  const existingKeys = useMemo(() => {
    const s = new Set<string>();
    L.rows.forEach((r) => {
      s.add(`${r.date}|${Number(r.amount).toFixed(2)}|${(r.description || "").toLowerCase().slice(0, 40)}|${r.bank_account_id || ""}`);
      if (r.external_id) s.add(`ext:${r.external_id}`);
    });
    return s;
  }, [L.rows]);

  const balance = L.cur.balance;
  const balanceStatus = balance === 0 ? "Zerado" : balance > 0 ? "Positivo" : "Negativo";

  const toggleAll = (v: boolean) =>
    setSelected(v ? new Set(pageRows.map((r) => r.id)) : new Set());

  const th = (label: string, key?: SortKey, extra = "") => (
    <th className={`px-3 py-3 text-muted-foreground font-medium whitespace-nowrap ${extra}`}>
      {key ? (
        <button
          className="inline-flex items-center gap-1 hover:text-foreground"
          onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }))}
        >
          {label} <ArrowUpDown size={11} />
        </button>
      ) : label}
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-barlow font-bold">Transações</h1>
          <p className="text-xs text-muted-foreground font-dm">
            Razão de entradas e saídas por unidade. {isConsolidated ? "Resultados consolidados de todas as unidades." : unitName(filterId)} · {monthFull(month)} de {year}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={syncBank} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando..." : "Sincronizar banco"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5"><Upload size={14} /> Importar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setImportKind("extrato")}>Importar extrato bancário</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportKind("vendas")}>Importar relatório de vendas</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportKind("recebimentos")}>Importar relatório de recebimentos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setImportKind("planilha")}>Importar planilha financeira</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5"><Download size={14} /> Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => doExport("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("xlsx")}>XLSX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => doExport("pdf")}>PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-1.5" onClick={() => { setFormTx(null); setFormOpen(true); }}>
            <Plus size={14} /> Novo lançamento
          </Button>
        </div>
      </div>

      {lastSync && (
        <p className="text-[11px] text-muted-foreground font-dm -mt-2">
          Última sincronização bancária: {new Date(lastSync).toLocaleString("pt-BR")}
        </p>
      )}

      {/* Navegação por competência */}
      <div className="bg-card rounded-xl card-shadow p-3 space-y-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center" aria-label="Ano anterior">
            <ChevronLeft size={15} />
          </button>
          <span className="text-sm font-barlow font-bold w-14 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center" aria-label="Próximo ano">
            <ChevronRight size={15} />
          </button>
          <div className="flex-1 overflow-x-auto no-scrollbar momentum-scroll">
            <div className="flex gap-1">
              {Array.from({ length: 12 }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setMonth(i)}
                  className={`px-3 h-8 rounded-lg text-xs font-dm shrink-0 transition-colors ${
                    i === month ? "bg-primary text-white font-semibold" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {monthName(i)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resultado do período */}
      <div>
        <p className="text-xs font-barlow font-bold text-muted-foreground mb-2">RESULTADO DO PERÍODO</p>
        {L.loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <StatCard label="Saldo do mês" value={fmtBRLShort(balance)} subtext={balanceStatus} trend={balance > 0 ? "up" : balance < 0 ? "down" : undefined} accent />
              <VarBadge value={variation(balance, L.prev.balance)} label="vs. mês anterior" />
            </div>
            <div>
              <StatCard label="Saldo do ano" value={fmtBRLShort(L.yearAgg.balance)} subtext={`Jan–Dez ${year} · ${L.yearAgg.balance === 0 ? "Zerado" : L.yearAgg.balance > 0 ? "Positivo" : "Negativo"}`} />
            </div>
            <div>
              <StatCard label="Receitas" value={fmtBRLShort(L.cur.income)} subtext={`${L.cur.incomeCount} lançamentos`} />
              <VarBadge value={variation(L.cur.income, L.prev.income)} label="vs. mês anterior" />
            </div>
            <div>
              <StatCard label="Despesas" value={fmtBRLShort(L.cur.expense)} subtext={`${L.cur.expenseCount} lançamentos`} />
              <VarBadge value={variation(L.cur.expense, L.prev.expense)} label="vs. mês anterior" invert />
            </div>
            <button className="text-left" onClick={() => { setFKind("expense"); setFStatus("pending"); }}>
              <StatCard label="Despesas pendentes" value={fmtBRLShort(L.pendingTotal)} subtext={`${L.pendingCount} em aberto · filtrar`} />
            </button>
          </div>
        )}
      </div>

      {/* Busca e filtros */}
      <div className="bg-card rounded-xl card-shadow p-3 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar descrição, categoria, conta, forma, identificador, Stone Code, fornecedor ou cliente"
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setShowFilters((s) => !s)}>
            <Filter size={14} /> Filtros{activeFilters ? ` (${activeFilters})` : ""}
          </Button>
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 shrink-0" onClick={clearFilters}>
              <X size={13} /> Limpar
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <select className={selectCls} value={fKind} onChange={(e) => setFKind(e.target.value)}>
              <option value="all">Todas · tipo</option>
              <option value="income">Entrada</option>
              <option value="expense">Saída</option>
            </select>
            <select className={selectCls} value={fGroup} onChange={(e) => { setFGroup(e.target.value); setFCat("all"); }}>
              <option value="all">Todos · grupo</option>
              {L.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <select className={selectCls} value={fCat} onChange={(e) => setFCat(e.target.value)}>
              <option value="all">Todas · categoria</option>
              <option value="none">Sem categoria</option>
              {catOptions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <select className={selectCls} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
              <option value="all">Todos · status</option>
              {STATUS_FILTERS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select className={selectCls} value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
              <option value="all">Todas · conta</option>
              {L.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select className={selectCls} value={fMethod} onChange={(e) => setFMethod(e.target.value)}>
              <option value="all">Todas · forma</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Aviso sem categoria */}
      {!L.loading && L.uncategorized > 0 && fCat !== "none" && (
        <button
          onClick={() => setFCat("none")}
          className="w-full flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-left"
        >
          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
          <span className="text-xs font-dm text-amber-800">
            Existem {L.uncategorized} transações sem categoria. Clique para filtrar.
          </span>
        </button>
      )}

      {/* Ações em lote */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-3 py-2">
          <span className="text-xs font-dm font-semibold">{selected.size} selecionadas</span>
          <Button size="sm" variant="outline" onClick={() => markPaid([...selected])}>Marcar como pago</Button>
          <Button size="sm" variant="outline" onClick={() => reconcile([...selected])}>Conciliar</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" variant="outline">Categorizar / mover</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
              {L.categories.map((c) => (
                <DropdownMenuItem key={c.id} onClick={() => patch([...selected], { category_id: c.id, category_name: c.name, group_id: c.group_id }, `Categorizado em ${c.name}`)}>
                  {c.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {L.groups.map((g) => (
                <DropdownMenuItem key={g.id} onClick={() => patch([...selected], { group_id: g.id }, `Grupo alterado para ${g.name}`)}>
                  Grupo: {g.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {units.map((u) => (
                <DropdownMenuItem key={u.id} onClick={() => patch([...selected], { unit_id: u.id }, `Unidade alterada para ${u.name}`)}>
                  Unidade: {u.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {L.accounts.map((a) => (
                <DropdownMenuItem key={a.id} onClick={() => patch([...selected], { bank_account_id: a.id }, `Conta alterada para ${a.name}`)}>
                  Conta: {a.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" onClick={() => doExport("csv")}>Exportar</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Limpar seleção</Button>
        </div>
      )}

      {/* Tabela (desktop) */}
      <div className="hidden md:block bg-card rounded-xl card-shadow table-scroll">
        <table className="w-full text-xs font-dm min-w-[900px]">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3 py-3 w-8">
                <Checkbox checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))} onCheckedChange={(v) => toggleAll(!!v)} />
              </th>
              {th("Data", "date")}
              {th("Descrição", "description")}
              {th("Tipo")}
              {th("Grupo")}
              {th("Categoria", "category_name")}
              {isConsolidated && th("Unidade")}
              {th("Conta")}
              {th("Valor", "amount", "text-right")}
              {th("Status", "status")}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {L.loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={11} className="px-3 py-2"><Skeleton className="h-6 w-full" /></td></tr>
              ))
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-10 text-center">
                  <p className="text-sm text-muted-foreground font-dm">Nenhum lançamento encontrado neste período</p>
                  <Button size="sm" className="mt-3 gap-1.5" onClick={() => { setFormTx(null); setFormOpen(true); }}>
                    <Plus size={14} /> Adicionar lançamento
                  </Button>
                </td>
              </tr>
            ) : (
              pageRows.map((r) => {
                const st = effStatus(r);
                const noCat = !r.category_id && !r.category_name;
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-border cursor-pointer hover:bg-muted/40 ${st === "overdue" ? "bg-red-50/60" : ""}`}
                    onClick={() => setDetail(r)}
                  >
                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) =>
                          setSelected((s) => {
                            const n = new Set(s);
                            v ? n.add(r.id) : n.delete(r.id);
                            return n;
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{new Date(`${r.date}T00:00:00`).toLocaleDateString("pt-BR")}</td>
                    <td className="px-3 py-2 max-w-[240px] truncate" title={r.description || ""}>{r.description}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${r.kind === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {r.kind === "income" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{groupName(r.group_id)}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${noCat ? "bg-orange-100 text-orange-700" : "bg-muted text-foreground/70"}`}>
                        {r.category_name || "Sem categoria"}
                      </span>
                    </td>
                    {isConsolidated && <td className="px-3 py-2 text-muted-foreground">{unitName(r.unit_id)}</td>}
                    <td className="px-3 py-2 text-muted-foreground">{accountName(r.bank_account_id)}</td>
                    <td className={`px-3 py-2 text-right font-semibold whitespace-nowrap ${r.kind === "income" ? "text-green-600" : "text-red-500"}`}>
                      {r.kind === "income" ? "+" : "-"} {fmtBRL(Number(r.amount))}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${statusClass(st)}`}>{statusLabel(st)}</span>
                    </td>
                    <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <RowMenu
                        r={r}
                        onDetail={() => setDetail(r)}
                        onEdit={() => { setFormTx(r); setFormOpen(true); }}
                        onDuplicate={() => duplicate(r)}
                        onPaid={() => markPaid([r.id])}
                        onPending={() => markPending([r.id])}
                        onReconcile={() => reconcile([r.id])}
                        onRefund={() => refund(r)}
                        onDelete={() => remove(r)}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-2">
        {L.loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : pageRows.length === 0 ? (
          <div className="bg-card rounded-xl card-shadow py-10 text-center">
            <p className="text-sm text-muted-foreground font-dm">Nenhum lançamento encontrado</p>
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => { setFormTx(null); setFormOpen(true); }}>
              <Plus size={14} /> Adicionar lançamento
            </Button>
          </div>
        ) : (
          pageRows.map((r) => {
            const st = effStatus(r);
            const noCat = !r.category_id && !r.category_name;
            return (
              <div key={r.id} className={`bg-card rounded-xl card-shadow p-3 ${st === "overdue" ? "border-l-4 border-l-red-400" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <button className="text-left min-w-0 flex-1" onClick={() => setDetail(r)}>
                    <p className="text-sm font-dm font-semibold truncate">{r.description}</p>
                    <p className="text-[11px] text-muted-foreground font-dm">
                      {new Date(`${r.date}T00:00:00`).toLocaleDateString("pt-BR")} · {accountName(r.bank_account_id)}
                      {isConsolidated ? ` · ${unitName(r.unit_id)}` : ""}
                    </p>
                  </button>
                  <RowMenu
                    r={r}
                    onDetail={() => setDetail(r)}
                    onEdit={() => { setFormTx(r); setFormOpen(true); }}
                    onDuplicate={() => duplicate(r)}
                    onPaid={() => markPaid([r.id])}
                    onPending={() => markPending([r.id])}
                    onReconcile={() => reconcile([r.id])}
                    onRefund={() => refund(r)}
                    onDelete={() => remove(r)}
                  />
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${noCat ? "bg-orange-100 text-orange-700" : "bg-muted text-foreground/70"}`}>
                      {r.category_name || "Sem categoria"}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] ${statusClass(st)}`}>{statusLabel(st)}</span>
                  </div>
                  <span className={`text-sm font-barlow font-bold ${r.kind === "income" ? "text-green-600" : "text-red-500"}`}>
                    {r.kind === "income" ? "+" : "-"} {fmtBRL(Number(r.amount))}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Paginação e resumo */}
      <div className="bg-card rounded-xl card-shadow p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-dm">
          <span className="text-muted-foreground">{sorted.length} lançamentos encontrados</span>
          <span className="text-green-600 font-semibold">Entradas {fmtBRL(totalIn)}</span>
          <span className="text-red-500 font-semibold">Saídas {fmtBRL(totalOut)}</span>
          <span className={`font-semibold ${totalIn - totalOut >= 0 ? "text-foreground" : "text-red-500"}`}>Saldo {fmtBRL(totalIn - totalOut)}</span>
        </div>
        <div className="flex items-center gap-2">
          <select className={selectCls} value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40" aria-label="Página anterior">
            <ChevronLeft size={15} />
          </button>
          <span className="text-xs font-dm">{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="h-8 w-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-40" aria-label="Próxima página">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {L.error && (
        <p className="text-xs text-red-500 font-dm">
          Não foi possível carregar os lançamentos: {L.error}{" "}
          <button className="underline" onClick={L.reload}>tentar de novo</button>
        </p>
      )}

      {!L.accounts.some((a) => a.provider) && (
        <p className="text-[11px] text-muted-foreground font-dm">
          Nenhuma integração bancária configurada.{" "}
          <Link to="/admin/financeiro/configuracoes" className="text-primary underline">Configurar integração</Link>
        </p>
      )}

      <TxFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        tx={formTx}
        groups={L.groups}
        categories={L.categories}
        accounts={L.accounts}
        suppliers={L.suppliers}
        units={units}
        defaultUnit={filterId}
        onSaved={L.reload}
      />

      <TxDetailSheet
        tx={detail}
        onOpenChange={(v) => !v && setDetail(null)}
        unitName={unitName}
        groupName={groupName}
        accountName={accountName}
        supplierName={supplierName}
        clientName={clientName}
      />

      {importKind && (
        <TxImportDialog
          open
          kind={importKind}
          onOpenChange={(v) => !v && setImportKind(null)}
          unitId={filterId}
          accounts={L.accounts}
          existingKeys={existingKeys}
          onDone={L.reload}
        />
      )}

      <AlertDialog open={!!confirmAsk} onOpenChange={(v) => !v && setConfirmAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAsk?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAsk?.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { const a = confirmAsk; setConfirmAsk(null); await a?.run(); }}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

type MenuProps = {
  r: Tx;
  onDetail: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onPaid: () => void;
  onPending: () => void;
  onReconcile: () => void;
  onRefund: () => void;
  onDelete: () => void;
};

const RowMenu = ({ r, onDetail, onEdit, onDuplicate, onPaid, onPending, onReconcile, onRefund, onDelete }: MenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center shrink-0" aria-label="Ações">
        <MoreVertical size={15} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={onDetail}>Visualizar detalhes</DropdownMenuItem>
      <DropdownMenuItem onClick={onEdit}>Editar</DropdownMenuItem>
      <DropdownMenuItem onClick={onEdit}>Categorizar</DropdownMenuItem>
      <DropdownMenuItem onClick={onDuplicate}>Duplicar</DropdownMenuItem>
      <DropdownMenuSeparator />
      {r.status !== "paid" && <DropdownMenuItem onClick={onPaid}>Marcar como pago</DropdownMenuItem>}
      {r.status !== "pending" && <DropdownMenuItem onClick={onPending}>Marcar como pendente</DropdownMenuItem>}
      {!r.reconciled && <DropdownMenuItem onClick={onReconcile}>Conciliar</DropdownMenuItem>}
      <DropdownMenuItem onClick={onEdit}>Anexar comprovante</DropdownMenuItem>
      <DropdownMenuSeparator />
      {r.status !== "refunded" && <DropdownMenuItem onClick={onRefund}>Estornar</DropdownMenuItem>}
      <DropdownMenuItem className="text-red-500" onClick={onDelete}>Excluir</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default Transacoes;
