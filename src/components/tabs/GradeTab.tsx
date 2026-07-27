import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CheckInDialog from "./CheckInDialog";

// DB day_of_week: 0=Dom ... 6=Sáb. Display order Seg..Dom.
const daysOfWeek = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const dayIndexToDb = [1, 2, 3, 4, 5, 6, 0];

type ClassRow = {
  id: string;
  name: string | null;
  trainer: string | null;
  start_time: string;
  end_time: string;
  day_of_week: number | null;
  max_slots: number | null;
};

type BookingRow = { class_id: string | null; muscle_group: string | null };

const GradeTab = () => {
  const todayJs = new Date().getDay(); // 0..6 (Dom..Sáb)
  const initialDay = Math.max(0, dayIndexToDb.indexOf(todayJs));
  const [activeDay, setActiveDay] = useState(initialDay);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeClass, setActiveClass] = useState<ClassRow | null>(null);

  const [authName, setAuthName] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("student_name") || "" : ""
  );
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      if (!u) return;
      const meta = (u.user_metadata || {}) as Record<string, string>;
      const name = meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "");
      if (name) {
        setAuthName(name);
        localStorage.setItem("student_name", name);
      }
    });
  }, []);

  const currentHour = new Date().getHours();

  const load = async () => {
    setLoading(true);
    const dbDay = dayIndexToDb[activeDay];
    const [{ data: cls }, { data: bks }] = await Promise.all([
      supabase.from("classes").select("*").eq("day_of_week", dbDay).order("start_time"),
      supabase.from("class_bookings").select("class_id, muscle_group"),
    ]);
    setClasses((cls || []) as ClassRow[]);
    setBookings((bks || []) as BookingRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeDay]);

  const bookingsByClass = useMemo(() => {
    const m: Record<string, number> = {};
    bookings.forEach((b) => { if (b.class_id) m[b.class_id] = (m[b.class_id] || 0) + 1; });
    return m;
  }, [bookings]);

  const handleConfirm = async ({ studentName, muscleGroup }: { studentName: string; muscleGroup: "inferior" | "superior" }) => {
    if (!activeClass) return;
    localStorage.setItem("student_name", studentName);
    const { error } = await supabase.from("class_bookings").insert({
      class_id: activeClass.id,
      student_name: studentName,
      muscle_group: muscleGroup,
      checked_in_at: new Date().toISOString(),
      status: "confirmed",
      booked_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Check-in confirmado!");
    load();
  };

  const openCheckIn = (c: ClassRow) => {
    if (!authName.trim()) {
      setEditingName(true);
      toast.info("Digite seu nome para fazer check-in");
      return;
    }
    setActiveClass(c);
    setDialogOpen(true);
  };

  const saveName = () => {
    const v = nameDraft.trim();
    if (!v) return;
    setAuthName(v);
    localStorage.setItem("student_name", v);
    setEditingName(false);
    setNameDraft("");
    toast.success("Nome salvo!");
  };

  return (
    <div>
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border">
        <h1 className="font-barlow font-bold text-xl text-foreground">GRADE DE AULAS</h1>
        <p className="text-xs text-muted font-dm">EVO Training Club</p>
      </div>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
        {daysOfWeek.map((d, i) => (
          <button
            key={d}
            onClick={() => setActiveDay(i)}
            className={`px-4 py-1.5 rounded-full text-xs font-dm font-semibold shrink-0 transition-colors
              ${i === activeDay ? "bg-primary text-white cta-shadow" : "bg-white text-muted card-shadow"}`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="px-4 pb-2">
        {authName && !editingName ? (
          <div className="flex items-center justify-between bg-white card-shadow rounded-xl px-3 py-2">
            <div className="text-xs font-dm">
              <span className="text-muted-foreground">Aluno: </span>
              <span className="font-semibold text-foreground">{authName}</span>
            </div>
            <button
              onClick={() => { setNameDraft(authName); setEditingName(true); }}
              className="text-[11px] font-dm text-primary font-semibold"
            >
              Alterar
            </button>
          </div>
        ) : (
          <div className="flex gap-2 bg-white card-shadow rounded-xl p-2">
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); }}
              placeholder="Digite seu nome"
              className="flex-1 px-3 py-1.5 text-xs font-dm bg-transparent outline-none"
            />
            <button
              onClick={saveName}
              disabled={!nameDraft.trim()}
              className="bg-primary text-white text-[11px] font-dm font-semibold px-3 py-1.5 rounded-lg cta-shadow disabled:opacity-40"
            >
              Salvar
            </button>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        {loading && <p className="text-xs text-muted font-dm py-4">Carregando...</p>}
        {!loading && classes.length === 0 && (
          <p className="text-xs text-muted font-dm py-6 text-center">Nenhuma aula neste dia.</p>
        )}
        {classes.map((c) => {
          const hour = parseInt(c.start_time.slice(0, 2), 10);
          const isCurrent = hour === currentHour;
          const filled = bookingsByClass[c.id] || 0;
          const max = c.max_slots || 14;
          const remaining = Math.max(0, max - filled);
          const isPeak = (hour >= 6 && hour <= 9) || (hour >= 17 && hour <= 20);
          const full = remaining === 0;
          return (
            <div key={c.id} className="flex gap-3 mb-3">
              <div className="flex flex-col items-center w-12 shrink-0">
                <span className="text-[11px] font-barlow font-bold text-muted">
                  {c.start_time.slice(0, 5)}
                </span>
                <div className={`flex-1 w-0.5 mt-1 ${isCurrent ? "bg-primary" : "bg-border"}`} />
              </div>
              <div className={`flex-1 rounded-2xl p-3 card-shadow ${isCurrent ? "bg-primary/5 border-l-4 border-l-primary" : "bg-white"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-dm font-semibold text-sm text-foreground">{c.name || "Musculação"}</p>
                      {isPeak && (
                        <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">HORÁRIO NOBRE</span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted font-dm mt-0.5">
                      {c.trainer ? `Prof. ${c.trainer}` : "Sem professor"}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className={`w-2 h-2 rounded-full ${full ? "bg-red-500" : "bg-green-500"}`} />
                      <span className={`text-[11px] font-dm ${full ? "text-red-600" : "text-green-600"}`}>
                        {full ? "Lotada" : `${remaining} vagas`}
                      </span>
                    </div>
                  </div>
                  <button
                    disabled={full}
                    onClick={() => openCheckIn(c)}
                    className="bg-primary text-white text-[11px] font-dm font-semibold px-3 py-1.5 rounded-lg cta-shadow disabled:opacity-40"
                  >
                    Check-in
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CheckInDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        classInfo={activeClass}
        defaultName={authName}
        onConfirm={handleConfirm}
      />
    </div>
  );
};

export default GradeTab;
