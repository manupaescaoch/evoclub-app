import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Dumbbell, Clock, MessageSquare, UserX } from "lucide-react";
import PainReportsPanel from "@/components/admin/treinos/PainReportsPanel";

type ClientRisk = {
  id: number;
  name: string;
  last_checkin: string | null;
};

type RecentActivity = {
  client_name: string;
  action: string;
  time: string;
};

const TreinosDashboard = () => {
  const [noWorkout, setNoWorkout] = useState(0);
  const [expiringThisWeek, setExpiringThisWeek] = useState(0);
  const [expiredWorkouts, setExpiredWorkouts] = useState(0);
  const [riskClients, setRiskClients] = useState<ClientRisk[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // Get all clients
      const { data: clients } = await supabase.from("clients").select("id, name, status");
      const allClients = clients || [];
      setTotalClients(allClients.length);

      // Get all workouts
      const { data: workouts } = await supabase.from("workouts").select("client_id, status, expires_at");
      const allWorkouts = workouts || [];

      // Clients with active workout
      const clientsWithWorkout = new Set(allWorkouts.filter(w => w.status === "active").map(w => w.client_id));
      setNoWorkout(allClients.length - clientsWithWorkout.size);

      // Vencendo: janela configurável em Configurações › Treinos
      const { data: cfgRow } = await supabase.from("app_settings").select("value").eq("key", "treinos").maybeSingle();
      const cfg = { warn_days_before: 7, expired_after_days: 0, ...((cfgRow?.value as any) || {}) };
      const now = new Date();
      const endOfWeek = new Date(now);
      endOfWeek.setDate(now.getDate() + Number(cfg.warn_days_before || 7));
      const expiring = allWorkouts.filter(w => {
        if (!w.expires_at || w.status !== "active") return false;
        const exp = new Date(w.expires_at);
        return exp >= now && exp <= endOfWeek;
      });
      setExpiringThisWeek(expiring.length);

      // Expired
      const expired = allWorkouts.filter(w => {
        if (!w.expires_at) return false;
        const limit = new Date(now);
        limit.setDate(limit.getDate() - Number(cfg.expired_after_days || 0));
        return new Date(w.expires_at) < limit;
      });
      setExpiredWorkouts(expired.length);

      // Check-ins - clients with no check-in in last 3 days
      const { data: checkIns } = await supabase.from("check_ins").select("client_id, checked_at");
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const lastCheckinMap: Record<number, string> = {};
      (checkIns || []).forEach(ci => {
        if (ci.client_id && (!lastCheckinMap[ci.client_id] || ci.checked_at! > lastCheckinMap[ci.client_id])) {
          lastCheckinMap[ci.client_id] = ci.checked_at!;
        }
      });

      const atRisk = allClients
        .filter(c => {
          const last = lastCheckinMap[c.id];
          if (!last) return true; // never checked in
          return new Date(last) < threeDaysAgo;
        })
        .slice(0, 10)
        .map(c => ({
          id: c.id,
          name: c.name,
          last_checkin: lastCheckinMap[c.id] || null,
        }));
      setRiskClients(atRisk);

      // Recent activity from check-ins
      const recent = (checkIns || [])
        .sort((a, b) => (b.checked_at || "").localeCompare(a.checked_at || ""))
        .slice(0, 5)
        .map(ci => {
          const client = allClients.find(c => c.id === ci.client_id);
          const checkedDate = new Date(ci.checked_at || "");
          const diffMs = Date.now() - checkedDate.getTime();
          const diffH = Math.floor(diffMs / 3600000);
          const timeStr = diffH < 1 ? "agora" : diffH < 24 ? `há ${diffH}h` : `há ${Math.floor(diffH / 24)} dias`;
          return {
            client_name: client?.name || "Cliente",
            action: "Realizou check-in diário",
            time: timeStr,
          };
        });
      setRecentActivity(recent);

      setLoading(false);
    };
    fetchData();
  }, []);

  const getCheckinLabel = (last: string | null) => {
    if (!last) return "Nunca fez check-in";
    const diff = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
    if (diff === 0) return "Hoje";
    return `${diff} dias sem check-in`;
  };

  const initials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground font-dm">Carregando...</div>;
  }

  return (
    <div>
      <h1 className="font-barlow font-bold text-2xl text-foreground mb-1">TREINOS</h1>
      <p className="text-sm text-muted-foreground font-dm mb-6">Dashboard de treinos e acompanhamento</p>

      <PainReportsPanel />

      {/* Alert Cards */}
      <h2 className="font-barlow font-bold text-sm text-muted-foreground tracking-wider mb-3">ALERTAS CRÍTICOS</h2>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-dm text-red-600">Sem Treino Ativo</p>
              <p className="text-3xl font-barlow font-bold text-red-600 mt-1">{noWorkout}</p>
              <p className="text-[11px] font-dm text-red-400 mt-0.5">Alunos sem plano</p>
            </div>
            <Dumbbell size={22} className="text-red-400" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-dm text-yellow-700">Vencem essa semana</p>
              <p className="text-3xl font-barlow font-bold text-yellow-600 mt-1">{expiringThisWeek}</p>
              <p className="text-[11px] font-dm text-yellow-500 mt-0.5">Precisam renovação</p>
            </div>
            <Clock size={22} className="text-yellow-500" />
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-dm text-orange-700">Treinos Vencidos</p>
              <p className="text-3xl font-barlow font-bold text-orange-600 mt-1">{expiredWorkouts}</p>
              <p className="text-[11px] font-dm text-orange-500 mt-0.5">Precisam renovação</p>
            </div>
            <Clock size={22} className="text-orange-500" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-dm text-muted-foreground">Total Alunos</p>
              <p className="text-3xl font-barlow font-bold text-foreground mt-1">{totalClients}</p>
              <p className="text-[11px] font-dm text-muted-foreground mt-0.5">Cadastrados</p>
            </div>
            <UserX size={22} className="text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Risk + Activity */}
      <div className="grid grid-cols-5 gap-4">
        {/* At Risk */}
        <div className="col-span-3 bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              <h3 className="font-barlow font-bold text-sm text-foreground">Alunos em Risco</h3>
            </div>
            <span className="bg-red-100 text-red-600 text-xs font-dm font-bold px-2.5 py-0.5 rounded-full">
              {riskClients.length} alunos
            </span>
          </div>
          <p className="text-xs text-muted-foreground font-dm mb-3">Alunos com mais de 3 dias sem realizar check-in ou 7 dias sem treino</p>

          <div className="space-y-2">
            {riskClients.length === 0 ? (
              <p className="text-xs text-muted-foreground font-dm py-4 text-center">Nenhum aluno em risco 🎉</p>
            ) : (
              riskClients.map(c => (
                <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold font-barlow">
                      {initials(c.name)}
                    </div>
                    <div>
                      <p className="text-sm font-dm font-semibold text-foreground">{c.name}</p>
                      <p className="text-[11px] font-dm text-red-500">{getCheckinLabel(c.last_checkin)}</p>
                    </div>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground">
                    <MessageSquare size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="col-span-2 bg-card border border-border rounded-xl p-4">
          <h3 className="font-barlow font-bold text-sm text-foreground mb-3">Atividade Recente</h3>
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground font-dm py-4 text-center">Nenhuma atividade recente</p>
            ) : (
              recentActivity.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                    <Dumbbell size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-dm font-semibold text-foreground">{a.client_name}</p>
                    <p className="text-[11px] font-dm text-muted-foreground">{a.action}</p>
                  </div>
                  <span className="text-[11px] font-dm text-muted-foreground">{a.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TreinosDashboard;
