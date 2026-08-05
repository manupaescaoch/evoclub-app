import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Moon, Zap, Smile } from "lucide-react";
import { useStudentName, brGreeting } from "@/hooks/useStudentName";

const brDate = () =>
  new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    .toISOString()
    .slice(0, 10);

const sleepLabels = ["Péssimo", "Ruim", "Ok", "Bom", "Excelente"];
const energyLabels = ["Muito baixa", "Baixa", "Normal", "Alta", "Muito alta"];
const stressLabels = ["Muito baixo", "Baixo", "Moderado", "Alto", "Muito alto"];
const moodEmojis = ["😭", "😕", "😐", "🙂", "😎"];

type ScaleProps = {
  value: number;
  onChange: (v: number) => void;
  labels: string[];
};

const Scale = ({ value, onChange, labels }: ScaleProps) => (
  <div className="flex justify-between gap-1">
    {labels.map((l, i) => {
      const v = i + 1;
      const active = v === value;
      return (
        <button
          key={l}
          onClick={() => onChange(v)}
          className="flex flex-col items-center gap-1 flex-1"
        >
          <span
            className={`w-10 h-10 rounded-full flex items-center justify-center font-barlow font-bold text-sm transition-colors ${
              active ? "bg-primary text-white cta-shadow" : "bg-secondary text-muted-foreground"
            }`}
          >
            {v}
          </span>
          <span
            className={`text-[9px] font-dm leading-tight text-center ${
              active ? "text-primary font-semibold" : "text-muted-foreground"
            }`}
          >
            {l}
          </span>
        </button>
      );
    })}
  </div>
);

const SectionHeader = ({
  icon,
  title,
  value,
}: {
  icon: React.ReactNode;
  title: string;
  value?: string;
}) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">{icon}</span>
      <span className="font-barlow font-bold text-base text-foreground">{title}</span>
    </div>
    {value && <span className="font-barlow font-bold text-sm text-muted-foreground">{value}</span>}
  </div>
);

const DailyCheckinDialog = () => {
  const [open, setOpen] = useState(false);
  const { name: studentName, clientId } = useStudentName();
  const greeting = brGreeting();
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [energy, setEnergy] = useState(4);
  const [mood, setMood] = useState(3);
  const [stress, setStress] = useState(3);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const today = brDate();
    if (localStorage.getItem("daily_checkin_date") === today) return;
    let alive = true;
    supabase
      .from("daily_checkins")
      .select("id")
      .eq("client_id", clientId)
      .eq("checkin_date", today)
      .maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        if (data) {
          localStorage.setItem("daily_checkin_date", today);
          return;
        }
        setOpen(true);
      });
    return () => { alive = false; };
  }, [clientId]);

  const skip = () => {
    localStorage.setItem("daily_checkin_date", brDate());
    setOpen(false);
  };

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    const { error } = await supabase.from("daily_checkins").upsert(
      {
        client_id: clientId,
        student_name: studentName,
        checkin_date: brDate(),
        sleep_hours: sleepHours,
        sleep_quality: sleepQuality,
        energy,
        mood,
        stress_level: stress,
      },
      { onConflict: "student_name,checkin_date" }
    );
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    localStorage.setItem("daily_checkin_date", brDate());
    toast.success("Check-in diário salvo!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) skip(); }}>
      <DialogContent className="max-w-[360px] p-0 rounded-2xl overflow-hidden">
        <div className="max-h-[75vh] overflow-y-auto px-4 pt-5 pb-3">
          <h2 className="font-barlow font-[800] text-2xl text-foreground">
            {greeting.text}
            {studentName ? `, ${studentName.split(" ")[0]}` : ""} {greeting.emoji}
          </h2>
          <p className="text-xs text-muted-foreground font-dm mt-0.5">
            Seu shape entrega como você viveu ontem.
          </p>

          <div className="border-t border-border mt-4 pt-4">
            <SectionHeader icon={<span>😴</span>} title="Horas de sono" value={`${sleepHours}h`} />
            <input
              type="range"
              min={3}
              max={12}
              step={0.5}
              value={sleepHours}
              onChange={(e) => setSleepHours(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground font-dm">
              <span>3h</span>
              <span>7h30</span>
              <span>12h</span>
            </div>
          </div>

          <div className="border-t border-border mt-4 pt-4">
            <SectionHeader
              icon={<Moon size={16} className="text-muted-foreground" />}
              title="Qualidade do sono"
              value={sleepLabels[sleepQuality - 1]}
            />
            <Scale value={sleepQuality} onChange={setSleepQuality} labels={sleepLabels} />
          </div>

          <div className="border-t border-border mt-4 pt-4">
            <SectionHeader
              icon={<Zap size={16} className="text-yellow-500" />}
              title="Energia"
              value={energyLabels[energy - 1]}
            />
            <Scale value={energy} onChange={setEnergy} labels={energyLabels} />
          </div>

          <div className="border-t border-border mt-4 pt-4">
            <SectionHeader icon={<Smile size={16} className="text-muted-foreground" />} title="Humor" />
            <div className="flex justify-between gap-1">
              {moodEmojis.map((e, i) => {
                const v = i + 1;
                return (
                  <button
                    key={e}
                    onClick={() => setMood(v)}
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-xl bg-secondary ${
                      v === mood ? "ring-2 ring-primary" : ""
                    }`}
                  >
                    {e}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border mt-4 pt-4">
            <SectionHeader
              icon={<span>🧠</span>}
              title="Nível de estresse"
              value={stressLabels[stress - 1]}
            />
            <Scale value={stress} onChange={setStress} labels={stressLabels} />
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 border-t border-border">
          <button onClick={skip} className="text-sm font-dm font-semibold text-muted-foreground px-2">
            Pular
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyCheckinDialog;