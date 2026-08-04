import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CheckInDialog from "./CheckInDialog";
import { useStudentName } from "@/hooks/useStudentName";

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

  const { name: authName, saveName, loading: nameLoading } = useStudentName();
  const [nameDraft, setNameDraft] = useState("");

  // Horário de Brasília (America/Sao_Paulo)
  const nowBR = useMemo(() => {
    const s = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
    return new Date(s);
  }, []);
  const currentHour = nowBR.getHours();
  const currentMinutes = nowBR.getMinutes();
  const todayDbDay = nowBR.getDay(); // 0..6
  const viewingDbDay = dayIndexToDb[activeDay];
  const isToday = viewingDbDay === todayDbDay;

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
      toast.info("Digite seu nome para fazer check-in");
      return;
    }
    setActiveClass(c);
    setDialogOpen(true);
  };

  const submitName = () => {
    if (!nameDraft.trim()) return;
    saveName(nameDraft);
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

      {authName && (
        <div className="px-4 pb-2">
          <div className="bg-white card-shadow rounded-xl px-3 py-2 text-xs font-dm">
            <span className="text-muted-foreground">Aluno: </span>
            <span className="font-semibold text-foreground">{authName}</span>
          </div>
        </div>
      )}

      <div className="px-4 pb-4">
        {loading && <p className="text-xs text-muted font-dm py-4">Carregando...</p>}
        {!loading && classes.length === 0 && (
          <p className="text-xs text-muted font-dm py-6 text-center">Nenhuma aula neste dia.</p>
        )}
        {classes.map((c) => {
          const hour = parseInt(c.start_time.slice(0, 2), 10);
          const minute = parseInt(c.start_time.slice(3, 5), 10) || 0;
          const endHour = parseInt(c.end_time.slice(0, 2), 10);
          const endMinute = parseInt(c.end_time.slice(3, 5), 10) || 0;
          const isCurrent = isToday && hour === currentHour;
          const nowMinutesTotal = currentHour * 60 + currentMinutes;
          const endMinutesTotal = endHour * 60 + endMinute;
          // Só desabilita quando é hoje e a aula já terminou
          const isPast = isToday && nowMinutesTotal >= endMinutesTotal;
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
              <div className={`flex-1 rounded-2xl p-3 card-shadow ${isCurrent ? "bg-primary/5 border-l-4 border-l-primary" : isPast ? "bg-muted/40 opacity-60" : "bg-white"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-dm font-semibold text-sm text-foreground">{c.name || "Musculação"}</p>
                      {isPeak && (
                        <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">HORÁRIO NOBRE</span>
                      )}
                      {isPast && (
                        <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-muted text-muted-foreground px-2 py-0.5 rounded-full">ENCERRADA</span>
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
                    disabled={full || isPast}
                    onClick={() => openCheckIn(c)}
                    className="bg-primary text-white text-[11px] font-dm font-semibold px-3 py-1.5 rounded-lg cta-shadow disabled:opacity-40"
                  >
                    {isPast ? "Encerrada" : "Check-in"}
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
