import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Dumbbell, HeartPulse, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";

type Tab = "treinos" | "checkins" | "agendas";

type WorkoutRow = { id: string; workout_date: string; session_name: string | null; status: string; rpe: number | null; pain: boolean | null };
type CheckinRow = { id: string; checkin_date: string; sleep_hours: number; sleep_quality: number; energy: number; mood: number };
type BookingRow = { id: string; class_date: string | null; status: string | null; muscle_group: string | null; kind: string };

const fmt = (d?: string | null) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";

const bookingLabel = (s?: string | null) =>
  s === "cancelled" ? "Cancelado" : s === "waitlist" ? "Lista de espera" : s === "attended" ? "Presente" : "Agendado";

const HistoricoTab = ({ onBack }: { onBack: () => void }) => {
  const { client } = useStudent();
  const [tab, setTab] = useState<Tab>("treinos");
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  useEffect(() => {
    if (!client?.id) return;
    setLoading(true);
    Promise.all([
      supabase
        .from("workout_logs")
        .select("id, workout_date, session_name, status, rpe, pain")
        .eq("client_id", client.id)
        .order("workout_date", { ascending: false })
        .limit(100),
      supabase
        .from("daily_checkins")
        .select("id, checkin_date, sleep_hours, sleep_quality, energy, mood")
        .eq("client_id", client.id)
        .order("checkin_date", { ascending: false })
        .limit(100),
      supabase
        .from("class_bookings")
        .select("id, class_date, status, muscle_group, kind")
        .eq("client_id", client.id)
        .order("class_date", { ascending: false })
        .limit(100),
    ]).then(([w, c, b]) => {
      setWorkouts((w.data || []) as WorkoutRow[]);
      setCheckins((c.data || []) as CheckinRow[]);
      setBookings((b.data || []) as BookingRow[]);
      setLoading(false);
    });
  }, [client?.id]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "treinos", label: "Treinos" },
    { key: "checkins", label: "Check-ins" },
    { key: "agendas", label: "Agendamentos" },
  ];

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center" aria-label="Voltar">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Meu histórico</p>
      </div>

      <div className="flex gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-[11px] font-dm font-semibold ${
              tab === t.key ? "bg-primary text-primary-foreground cta-shadow" : "bg-white text-muted card-shadow"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-primary" size={22} />
        </div>
      ) : (
        <div className="space-y-2">
          {tab === "treinos" &&
            (workouts.length === 0 ? (
              <p className="text-xs font-dm text-muted text-center py-8">Nenhum treino registrado ainda.</p>
            ) : (
              workouts.map((w) => (
                <div key={w.id} className="rounded-2xl bg-white p-4 card-shadow flex items-center gap-3">
                  <Dumbbell size={16} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-dm font-semibold text-foreground">{w.session_name || "Treino"}</p>
                    <p className="text-[11px] font-dm text-muted">
                      {fmt(w.workout_date)}
                      {w.rpe ? ` · PSE ${w.rpe}` : ""}
                      {w.pain ? " · dor relatada" : ""}
                    </p>
                  </div>
                  <span className="text-[10px] font-dm text-muted">
                    {w.status === "completed" ? "Concluído" : "Em andamento"}
                  </span>
                </div>
              ))
            ))}

          {tab === "checkins" &&
            (checkins.length === 0 ? (
              <p className="text-xs font-dm text-muted text-center py-8">Nenhum check-in registrado ainda.</p>
            ) : (
              checkins.map((c) => (
                <div key={c.id} className="rounded-2xl bg-white p-4 card-shadow flex items-center gap-3">
                  <HeartPulse size={16} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-dm font-semibold text-foreground">{fmt(c.checkin_date)}</p>
                    <p className="text-[11px] font-dm text-muted">
                      Sono {c.sleep_hours}h · Qualidade {c.sleep_quality}/5 · Energia {c.energy}/5 · Humor {c.mood}/5
                    </p>
                  </div>
                </div>
              ))
            ))}

          {tab === "agendas" &&
            (bookings.length === 0 ? (
              <p className="text-xs font-dm text-muted text-center py-8">Nenhum agendamento ainda.</p>
            ) : (
              bookings.map((b) => (
                <div key={b.id} className="rounded-2xl bg-white p-4 card-shadow flex items-center gap-3">
                  <CalendarCheck size={16} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-dm font-semibold text-foreground">{fmt(b.class_date)}</p>
                    <p className="text-[11px] font-dm text-muted">
                      {b.muscle_group === "inferior" ? "Inferior" : b.muscle_group === "superior" ? "Superior" : "Treino"}
                    </p>
                  </div>
                  <span className="text-[10px] font-dm text-muted">{bookingLabel(b.status)}</span>
                </div>
              ))
            ))}
        </div>
      )}
    </div>
  );
};

export default HistoricoTab;
