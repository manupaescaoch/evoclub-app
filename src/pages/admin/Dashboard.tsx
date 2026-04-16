import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/admin/StatCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Plus, ShoppingCart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#1400FF", "#7C3AED", "#059669", "#F59E0B"];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<"clientes" | "vendas" | "financeiro">("clientes");
  const [stats, setStats] = useState({ total: 0, ativos: 0, inad: 0, suspensos: 0 });
  const [cancelReasons, setCancelReasons] = useState<{ name: string; value: number }[]>([]);
  const [salesStats, setSalesStats] = useState({ totalSales: 0, avgTicket: 0 });
  const [loading, setLoading] = useState(true);

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
    setCancelReasons(Object.entries(reasonMap).map(([name, value]) => ({ name, value })));

    const sales = salesRes.data || [];
    const totalSales = sales.reduce((s, v) => s + (Number(v.value) || 0), 0);
    setSalesStats({ totalSales, avgTicket: sales.length ? totalSales / sales.length : 0 });

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const tabs = ["clientes", "vendas", "financeiro"] as const;
  const tabLabels = { clientes: "Clientes", vendas: "Vendas", financeiro: "Financeiro" };

  const renewalData = [
    { month: "Jan", value: 18 }, { month: "Fev", value: 24 }, { month: "Mar", value: 15 },
    { month: "Abr", value: 30 }, { month: "Mai", value: 22 }, { month: "Jun", value: 28 },
  ];

  const churnPct = stats.total ? ((stats.total - stats.ativos) / stats.total * 100).toFixed(1) : "0";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-barlow font-bold text-2xl text-foreground">Que bom ter você aqui!</h1>
          <p className="text-sm text-muted-foreground font-dm">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
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
          <div className="grid grid-cols-4 gap-4 mb-4">
            <StatCard label="Clientes Ativos" value={stats.ativos} accent trend="up" trendValue="+5%" />
            <StatCard label="Adimplentes" value={stats.ativos - stats.inad} trend="up" trendValue="92%" />
            <StatCard label="Inadimplentes" value={stats.inad} trend="down" trendValue={`${stats.inad}`} />
            <StatCard label="Evasão (Churn)" value={`${churnPct}%`} trend="down" trendValue="2.1%" />
          </div>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="VIP" value={Math.round(stats.ativos * 0.08)} />
            <StatCard label="Suspensos" value={stats.suspensos} />
            <StatCard label="Tempo Médio de Vida" value="8.2" sub="meses" />
            <StatCard label="Acessos Hoje" value={Math.round(stats.ativos * 0.35)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl p-5 card-shadow">
              <p className="text-sm font-dm font-semibold text-foreground mb-4">Renovações</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={renewalData}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#1400FF" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl p-5 card-shadow">
              <p className="text-sm font-dm font-semibold text-foreground mb-4">Contratos Cancelados</p>
              {cancelReasons.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={cancelReasons} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label>
                      {cancelReasons.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem cancelamentos</p>
              )}
            </div>
          </div>
        </>
      ) : activeTab === "vendas" ? (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Vendas do Mês" value={`R$ ${salesStats.totalSales.toLocaleString("pt-BR")}`} accent trend="up" trendValue="+12%" />
          <StatCard label="Ticket Médio" value={`R$ ${salesStats.avgTicket.toFixed(0)}`} />
          <StatCard label="Renovações" value="24" trend="up" trendValue="+8%" />
          <StatCard label="Novas Matrículas" value="18" trend="up" trendValue="+15%" />
          <StatCard label="Cancelamentos" value={cancelReasons.reduce((s, r) => s + r.value, 0)} trend="down" trendValue="-3%" />
          <StatCard label="Conversão Leads" value="34%" trend="up" trendValue="+2%" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Receita Bruta" value={`R$ ${salesStats.totalSales.toLocaleString("pt-BR")}`} accent />
          <StatCard label="Inadimplência" value={`R$ ${(salesStats.totalSales * 0.08).toFixed(0)}`} trend="down" trendValue="-1.2%" />
          <StatCard label="Churn R$" value={`R$ ${(salesStats.totalSales * 0.05).toFixed(0)}`} />
          <StatCard label="MRR" value={`R$ ${(salesStats.totalSales * 0.85).toFixed(0)}`} trend="up" trendValue="+4%" />
          <StatCard label="LTV Médio" value="R$ 2.400" />
          <StatCard label="CAC Estimado" value="R$ 180" />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
