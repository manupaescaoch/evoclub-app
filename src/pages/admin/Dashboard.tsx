import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, ShoppingCart, HelpCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart,
} from "recharts";

const DONUT_COLORS = ["#0057FF", "#3B82F6", "#10B981", "#0057FF"];
const REASON_LABELS: Record<string, string> = {
  financeiro: "Problemas financeiros",
  transferencia: "Transferido para filial EVO TRAINING CLUB - UND 2",
  tempo: "Falta de tempo/Não frequenta",
  outro: "Outros (especificar)",
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"clientes" | "vendas" | "financeiro">("clientes");
  const [stats, setStats] = useState({ total: 0, ativos: 0, inad: 0, suspensos: 0 });
  const [cancelReasons, setCancelReasons] = useState<{ name: string; value: number }[]>([]);
  const [salesStats, setSalesStats] = useState({ totalSales: 0, avgTicket: 0 });
  const [loading, setLoading] = useState(true);
  const [cancelPeriod, setCancelPeriod] = useState<"dia" | "mes">("mes");

  const fetchData = async () => {
    setLoading(true);
    const [clientsRes, cancelsRes, salesRes] = await Promise.all([
      supabase.from("clients").select("status"),
      supabase.from("cancellations").select("reason"),
      supabase.from("sales").select("value"),
    ]);

    const clients = clientsRes.data || [];
    setStats({
      total: clients.length,
      ativos: clients.filter(c => c.status === "AT").length,
      inad: Math.round(clients.filter(c => c.status === "SU").length * 0.6),
      suspensos: clients.filter(c => c.status === "SU").length,
    });

    const cancels = cancelsRes.data || [];
    const reasonMap: Record<string, number> = {};
    cancels.forEach(c => { if (c.reason) reasonMap[c.reason] = (reasonMap[c.reason] || 0) + 1; });
    setCancelReasons(Object.entries(reasonMap).map(([name, value]) => ({
      name: REASON_LABELS[name] || name,
      value,
    })));

    const sales = salesRes.data || [];
    const totalSales = sales.reduce((s, v) => s + (Number(v.value) || 0), 0);
    setSalesStats({ totalSales, avgTicket: sales.length ? totalSales / sales.length : 0 });

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const tabs = ["clientes", "vendas", "financeiro"] as const;
  const tabLabels = { clientes: "Clientes", vendas: "Vendas", financeiro: "Financeiro" };

  // Mock hourly access data (1-24h)
  const accessData = Array.from({ length: 24 }, (_, i) => {
    const h = i + 1;
    const isPeak = (h >= 6 && h <= 9) || (h >= 17 && h <= 20);
    return {
      hour: h,
      clientes: isPeak ? Math.round(3 + Math.random() * 3) : Math.round(Math.random() * 2),
      media: isPeak ? 4 : 1.5,
    };
  });

  // Mock renewal data by month
  const renewalData = [
    { month: "11/2025", aVencer: 22, renovados: 11 },
    { month: "12/2025", aVencer: 25, renovados: 3 },
    { month: "1/2026", aVencer: 20, renovados: 8 },
    { month: "2/2026", aVencer: 18, renovados: 10 },
    { month: "3/2026", aVencer: 22, renovados: 9 },
    { month: "4/2026", aVencer: 26, renovados: 5 },
    { month: "5/2026", aVencer: 17, renovados: 0 },
    { month: "6/2026", aVencer: 12, renovados: 1 },
  ];

  const totalCancels = cancelReasons.reduce((s, r) => s + r.value, 0);
  const churnPct = stats.total ? ((stats.total - stats.ativos) / stats.total * 100).toFixed(1) : "0";
  const currentAccessCount = accessData.reduce((s, d) => s + d.clientes, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-barlow font-bold text-2xl text-foreground">Que bom ter você aqui!</h1>
          <p className="text-sm text-muted-foreground font-dm">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchData}><RefreshCw size={18} /></Button>
      </div>

      {/* Quick actions */}
      <div className="flex gap-3 mb-6">
        <Button className="bg-[#059669] hover:bg-[#047857] text-white font-dm gap-2">
          <Plus size={16} /> Novo cadastro
        </Button>
        <Button className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-dm gap-2">
          <ShoppingCart size={16} /> Nova venda
        </Button>
      </div>

      {/* Section label */}
      <p className="text-[11px] uppercase tracking-[2px] text-muted-foreground font-barlow font-bold mb-3">DASHBOARD GERENCIAL</p>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-border">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`pb-2 text-sm font-dm font-medium transition-colors
              ${activeTab === t ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tabLabels[t]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl p-4 card-shadow h-24 animate-pulse" />
          ))}
        </div>
      ) : activeTab === "clientes" ? (
        <>
          {/* Stat cards row 1 */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <StatCard label="Clientes Ativos" value={stats.ativos} accent trend="up" trendValue="+5%" />
            <StatCard label="Adimplentes" value={stats.ativos - stats.inad} trend="up" trendValue="92%" />
            <StatCard label="Inadimplentes" value={stats.inad} trend="down" trendValue={`${stats.inad}`} />
            <StatCard label="Evasão (Churn)" value={`${churnPct}%`} trend="down" trendValue="2.1%" />
          </div>
          {/* Stat cards row 2 */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="VIP" value={Math.round(stats.ativos * 0.08)} />
            <StatCard label="Suspensos" value={stats.suspensos} />
            <StatCard label="Tempo Médio de Vida" value="8.2" sub="meses" />
            <StatCard label="Acessos Hoje" value={currentAccessCount} />
          </div>

          {/* Contratos cancelados + Acessos do dia */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Contratos cancelados */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <span className="text-sm font-dm font-semibold text-foreground">Contratos cancelados</span>
                  <HelpCircle size={14} className="text-muted-foreground" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCancelPeriod("dia")}
                    className={`text-xs font-dm px-2 py-1 rounded ${cancelPeriod === "dia" ? "text-primary font-semibold" : "text-muted-foreground"}`}
                  >
                    DIA
                  </button>
                  <button
                    onClick={() => setCancelPeriod("mes")}
                    className={`text-xs font-dm px-2 py-1 rounded ${cancelPeriod === "mes" ? "text-primary font-semibold" : "text-muted-foreground"}`}
                  >
                    MÊS
                  </button>
                </div>
              </div>

              {/* Numbers row */}
              <div className="flex gap-8 mb-4">
                <div>
                  <span className="text-4xl font-barlow font-bold text-foreground">{totalCancels}</span>
                  <div className="text-xs text-muted-foreground font-dm">Abril<br/>Meta: 0%</div>
                </div>
                <div>
                  <span className="text-4xl font-barlow font-bold text-foreground">0</span>
                  <div className="text-xs text-muted-foreground font-dm">Hoje<br/>{new Date().toLocaleDateString("pt-BR")}</div>
                </div>
              </div>

              {/* Donut + Legend */}
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cancelReasons} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" stroke="none">
                        {cancelReasons.map((_, i) => (
                          <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {cancelReasons.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-[11px] text-muted-foreground font-dm leading-tight">{r.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Acessos do dia */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏋️</span>
                  <span className="text-sm font-dm font-semibold text-foreground">Acessos do dia</span>
                  <HelpCircle size={14} className="text-muted-foreground" />
                </div>
                <span className="text-xs text-primary font-dm font-semibold">Hoje</span>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-barlow font-bold text-foreground">{currentAccessCount}</span>
                  <span className="text-xs text-muted-foreground font-dm">Clientes na academia na última hora</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary/30" />
                  <span className="text-[11px] text-muted-foreground font-dm">Total de clientes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-primary" />
                  <span className="text-[11px] text-muted-foreground font-dm">Média de acessos</span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={160}>
                <ComposedChart data={accessData}>
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="clientes" fill="hsl(var(--primary) / 0.25)" radius={[2, 2, 0, 0]} />
                  <Line dataKey="media" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} type="monotone" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Renovações */}
          <div className="bg-card rounded-xl p-5 card-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <span className="text-sm font-dm font-semibold text-foreground">Renovações</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-4xl font-barlow font-bold text-foreground">5</span>
              <div className="text-xs text-muted-foreground font-dm">
                Abril<br/>Total a vencer: 26 <span className="text-green-600">(19%)</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-primary" />
                <span className="text-[11px] text-muted-foreground font-dm">A vencer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
                <span className="text-[11px] text-muted-foreground font-dm">Renovados</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={renewalData}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="aVencer" fill="#0057FF" radius={[3, 3, 0, 0]} name="A vencer" />
                <Bar dataKey="renovados" fill="#10B981" radius={[3, 3, 0, 0]} name="Renovados" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : activeTab === "vendas" ? (
        <>
          {/* Row 1: 3 stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Contratos vendidos */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">📊</span>
                <span className="text-sm font-dm font-semibold text-foreground">Contratos vendidos</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <span className="text-4xl font-barlow font-bold text-foreground">26</span>
              <p className="text-xs text-muted-foreground font-dm mt-1">Meta: 0 (0%)</p>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">7 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
            {/* Mensal média contratos */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">📊</span>
                <span className="text-sm font-dm font-semibold text-foreground">Mensal. média dos contratos vendidos</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-4xl font-barlow font-bold text-green-600">555,74</span>
              </div>
              <p className="text-xs text-muted-foreground font-dm mt-1">Meta: R$ 0,00 (0%)</p>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">R$ 53,42 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
            {/* Tempo médio contrato */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">📊</span>
                <span className="text-sm font-dm font-semibold text-foreground">Tempo médio de contrato</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-barlow font-bold text-green-600">5,3</span>
                <span className="text-lg text-green-600 font-dm">meses</span>
              </div>
              <p className="text-xs text-muted-foreground font-dm mt-1">Meta: 0 (0%)</p>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">1 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
          </div>

          {/* Row 2: 3 stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">🛒</span>
                <span className="text-sm font-dm font-semibold text-foreground">Total de vendas manuais</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-4xl font-barlow font-bold text-foreground">{(salesStats.totalSales / 1000).toFixed(1)}</span>
                <span className="text-lg text-green-600 font-dm font-semibold">mil+</span>
              </div>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">R$ 35.497,00 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">🛒</span>
                <span className="text-sm font-dm font-semibold text-foreground">Total de vendas recorrentes</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-4xl font-barlow font-bold text-foreground">0</span>
              </div>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">R$ 0,00 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">🛒</span>
                <span className="text-sm font-dm font-semibold text-foreground">Total de vendas online</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-4xl font-barlow font-bold text-foreground">0</span>
              </div>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">R$ 0,00 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
          </div>

          {/* Total de vendas + Mensal média charts */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Total de vendas */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💜</span>
                  <span className="text-sm font-dm font-semibold text-foreground">Total de vendas</span>
                  <HelpCircle size={14} className="text-muted-foreground" />
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground font-dm">Dia</span>
                  <span className="text-xs text-primary font-dm font-semibold">Mês</span>
                </div>
              </div>
              <div className="flex gap-6 mb-3">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-muted-foreground font-dm">R$</span>
                    <span className="text-3xl font-barlow font-bold text-foreground">{(salesStats.totalSales / 1000).toFixed(1)}</span>
                    <span className="text-sm text-green-600 font-dm font-semibold">mil+</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-dm">Meta: R$ 0 (0%)<br/>Abril 2025: R$ 0</p>
                </div>
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-muted-foreground font-dm">R$</span>
                    <span className="text-3xl font-barlow font-bold text-foreground">0</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-dm">Hoje<br/>{new Date().toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
              <div className="flex gap-4 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-[10px] text-muted-foreground font-dm">Meta Mensal</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#F97316]" />
                  <span className="text-[10px] text-muted-foreground font-dm">Total de Vendas</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={[
                  { m: "11/25", meta: 0, vendas: 8500 },
                  { m: "12/25", meta: 0, vendas: 12300 },
                  { m: "1/26", meta: 0, vendas: 9800 },
                  { m: "2/26", meta: 0, vendas: 15600 },
                  { m: "3/26", meta: 0, vendas: 18200 },
                  { m: "4/26", meta: 0, vendas: salesStats.totalSales },
                ]}>
                  <XAxis dataKey="m" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR")}`} />
                  <Bar dataKey="meta" fill="#0057FF" radius={[2, 2, 0, 0]} name="Meta" />
                  <Bar dataKey="vendas" fill="#F97316" radius={[2, 2, 0, 0]} name="Vendas" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Mensal média contratos vendidos */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-muted-foreground">📊</span>
                <span className="text-sm font-dm font-semibold text-foreground">Mensal. média dos contratos vendidos</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-3xl font-barlow font-bold text-foreground">555,74</span>
                <div className="text-[10px] text-muted-foreground font-dm">Abril<br/>Meta: R$ 0 <span className="text-green-600">(0%)</span></div>
              </div>
              <div className="flex gap-4 mb-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#F97316]" />
                  <span className="text-[10px] text-muted-foreground font-dm">Mensalidade média</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-[10px] text-muted-foreground font-dm">Meta mensal</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <ComposedChart data={[
                  { m: "12/25", media: 480, meta: 0 },
                  { m: "1/26", media: 510, meta: 0 },
                  { m: "2/26", media: 530, meta: 0 },
                  { m: "3/26", media: 520, meta: 0 },
                  { m: "4/26", media: 555, meta: 0 },
                ]}>
                  <XAxis dataKey="m" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Line dataKey="media" stroke="#F97316" strokeWidth={2} dot={{ r: 3 }} name="Média" />
                  <Line dataKey="meta" stroke="#0057FF" strokeWidth={2} dot={{ r: 3 }} name="Meta" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Visitantes x Conversões */}
          <div className="bg-card rounded-xl p-5 card-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">💜</span>
                <span className="text-sm font-dm font-semibold text-foreground">Visitantes x conversões</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-dm">Últimos 7 dias</span>
                <span className="text-xs text-primary font-dm font-semibold">Mês</span>
                <span className="text-xs text-primary font-dm font-semibold border border-primary rounded-full px-2 py-0.5">Tipo: Oportunidades</span>
              </div>
            </div>
            <div className="flex gap-8 mb-4">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-barlow font-bold text-foreground">24</span>
                  <span className="text-xl text-muted-foreground font-barlow">x</span>
                  <span className="text-3xl font-barlow font-bold text-foreground">17</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-dm">Abril<br/>Meta: 0% <span className="text-green-600">(70,83%)</span></p>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-barlow font-bold text-foreground">0</span>
                  <span className="text-xl text-muted-foreground font-barlow">x</span>
                  <span className="text-3xl font-barlow font-bold text-foreground">0</span>
                </div>
                <p className="text-[10px] text-muted-foreground font-dm">Hoje<br/>Convertidos: 0%</p>
              </div>
            </div>
            <div className="flex gap-4 mb-3">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#F97316]" />
                <span className="text-[10px] text-muted-foreground font-dm">Conversões</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#2DD4BF]" />
                <span className="text-[10px] text-muted-foreground font-dm">Visitantes</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { m: "11/2025", conversoes: 8, visitantes: 10 },
                { m: "12/2025", conversoes: 3, visitantes: 22 },
                { m: "1/2026", conversoes: 7, visitantes: 20 },
                { m: "2/2026", conversoes: 10, visitantes: 28 },
                { m: "3/2026", conversoes: 9, visitantes: 30 },
                { m: "4/2026", conversoes: 17, visitantes: 24 },
              ]}>
                <XAxis dataKey="m" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="visitantes" fill="#2DD4BF" radius={[3, 3, 0, 0]} name="Visitantes" />
                <Bar dataKey="conversoes" fill="#F97316" radius={[3, 3, 0, 0]} name="Conversões" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <>
          {/* Row 1: 3 cards */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Inadimplência */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">📊</span>
                <span className="text-sm font-dm font-semibold text-foreground">Inadimplência</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-4xl font-barlow font-bold text-foreground">{(salesStats.totalSales * 0.08 / 1000).toFixed(1)}</span>
                <span className="text-lg text-muted-foreground font-dm">mil+</span>
              </div>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">R$ 12.934,55 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
            {/* Contas a pagar vencidas */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">📋</span>
                <span className="text-sm font-dm font-semibold text-foreground">Contas a pagar vencidas</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-4xl font-barlow font-bold text-red-500">12</span>
                <span className="text-lg text-red-500 font-dm">mil+</span>
              </div>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-red-500 text-xs">↓</span>
                <span className="text-xs text-muted-foreground font-dm">R$ 11.364,00 A MAIS QUE O PERÍODO ANTERIOR</span>
              </div>
            </div>
            {/* Custo por cliente */}
            <div className="bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-muted-foreground">📊</span>
                <span className="text-sm font-dm font-semibold text-foreground">Custo por cliente</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-4xl font-barlow font-bold text-green-600">606</span>
              </div>
              <p className="text-xs text-muted-foreground font-dm mt-1">Meta: R$ 0,00 (0%)</p>
              <div className="border-t border-border mt-3 pt-2 flex items-center gap-1">
                <span className="text-green-600 text-xs">↑</span>
                <span className="text-xs text-muted-foreground font-dm">R$ 7,00 A MENOS DO QUE PERÍODO ANTERIOR</span>
              </div>
            </div>
          </div>

          {/* Recebimentos e gastos + Ticket médio */}
          <div className="grid grid-cols-5 gap-4">
            {/* Recebimentos e gastos — 3 cols */}
            <div className="col-span-3 bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">💰</span>
                <span className="text-sm font-dm font-semibold text-foreground">Recebimentos e gastos</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex gap-8 mb-4">
                <div>
                  <p className="text-xs text-muted-foreground font-dm mb-0.5">Total de recebimentos</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-muted-foreground font-dm">R$</span>
                    <span className="text-3xl font-barlow font-bold text-foreground">{(salesStats.totalSales / 1000).toFixed(1)}</span>
                    <span className="text-sm text-green-600 font-dm font-semibold">mil+</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-dm mb-0.5">Total Gastos</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-muted-foreground font-dm">R$</span>
                    <span className="text-3xl font-barlow font-bold text-red-500">{(salesStats.totalSales * 0.79 / 1000).toFixed(1)}</span>
                    <span className="text-sm text-red-500 font-dm font-semibold">mil+</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#10B981]" />
                  <span className="text-[10px] text-muted-foreground font-dm">Total de recebimentos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-primary" />
                  <span className="text-[10px] text-muted-foreground font-dm">Meta de gastos</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={Array.from({ length: 16 }, (_, i) => {
                  const day = i + 1;
                  const isPeak = day >= 5 && day <= 9;
                  return {
                    day,
                    recebimentos: isPeak ? 8000 + Math.random() * 20000 : 1000 + Math.random() * 5000,
                    gastos: 2000 + Math.random() * 4000,
                  };
                })}>
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)},000` : v} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`} />
                  <Line dataKey="recebimentos" stroke="#10B981" strokeWidth={2} dot={false} type="monotone" name="Recebimentos" />
                  <Line dataKey="gastos" stroke="#0057FF" strokeWidth={2} dot={false} type="monotone" name="Gastos" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Ticket médio — 2 cols */}
            <div className="col-span-2 bg-card rounded-xl p-5 card-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-muted-foreground">📊</span>
                <span className="text-sm font-dm font-semibold text-foreground">Ticket médio</span>
                <HelpCircle size={14} className="text-muted-foreground" />
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-lg text-muted-foreground font-dm">R$</span>
                <span className="text-3xl font-barlow font-bold text-foreground">{salesStats.avgTicket.toFixed(2).replace(".", ",")}</span>
                <div className="text-[10px] text-muted-foreground font-dm">Março<br/>Meta: R$ 0,00 (0%)</div>
              </div>
              <div className="flex gap-4 mb-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-[#F97316]" />
                  <span className="text-[10px] text-muted-foreground font-dm">Ticket médio anual</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={[
                  { m: "12/2025", ticket: 420 },
                  { m: "1/2026", ticket: 460 },
                  { m: "2/2026", ticket: 480 },
                  { m: "3/2026", ticket: 490 },
                ]}>
                  <XAxis dataKey="m" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} domain={[0, 600]} />
                  <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
                  <Bar dataKey="ticket" fill="#F97316" radius={[3, 3, 0, 0]} name="Ticket" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
