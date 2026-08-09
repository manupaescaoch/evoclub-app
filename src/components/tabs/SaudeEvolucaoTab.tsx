import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Scale, Target,
  HeartPulse, Activity, Moon, Star, Plus, ArrowUpDown, ClipboardList, Camera,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStudentName } from "@/hooks/useStudentName";
import { useHealthSummary, useHealthSeries, RANGES, RangeKey, SeriesKey } from "@/hooks/useHealth";
import AvaliacoesTab from "./AvaliacoesTab";
import FotosEvolucaoTab from "./FotosEvolucaoTab";

type CardKey = "weight" | "goal" | "resting_hr" | "blood_pressure" | "sleep_hours" | "sleep_quality";
const DEFAULT_ORDER: CardKey[] = ["weight", "goal", "resting_hr", "blood_pressure", "sleep_hours", "sleep_quality"];

const meta: Record<CardKey, { label: string; icon: any; unit: string; series?: SeriesKey }> = {
  weight: { label: "Peso atual", icon: Scale, unit: "kg", series: "weight" },
  goal: { label: "Meta de peso", icon: Target, unit: "kg" },
  resting_hr: { label: "FC de repouso", icon: HeartPulse, unit: "bpm", series: "resting_hr" },
  blood_pressure: { label: "Pressão arterial", icon: Activity, unit: "mmHg", series: "blood_pressure" },
  sleep_hours: { label: "Horas de sono", icon: Moon, unit: "h", series: "sleep_hours" },
  sleep_quality: { label: "Qualidade do sono", icon: Star, unit: "/5", series: "sleep_quality" },
};

const fmtDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

const DetailSheet = ({
  cardKey, onClose, onSaved,
}: { cardKey: CardKey; onClose: () => void; onSaved: () => void }) => {
  const { clientId, name } = useStudentName();
  const [range, setRange] = useState<RangeKey>("30d");
  const series = meta[cardKey].series ?? "weight";
  const { points, loading, reload } = useHealthSeries(series, range);
  const [v1, setV1] = useState("");
  const [v2, setV2] = useState("");
  const [saving, setSaving] = useState(false);

  const canRegister = cardKey === "weight" || cardKey === "resting_hr" || cardKey === "blood_pressure";

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    let error: any = null;
    if (cardKey === "weight") {
      ({ error } = await supabase.from("health_weights").insert({
        client_id: clientId, value: Number(v1.replace(",", ".")), recorded_by: name, source: "manual",
      }));
    } else if (cardKey === "resting_hr") {
      ({ error } = await supabase.from("health_metrics").insert({
        client_id: clientId, metric: "resting_hr", value: Number(v1), source: "manual",
      }));
    } else {
      ({ error } = await supabase.from("health_blood_pressure").insert({
        client_id: clientId, systolic: Number(v1), diastolic: Number(v2), recorded_by: name, source: "manual",
      }));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setV1(""); setV2("");
    toast.success("Registro salvo!");
    reload(); onSaved();
  };

  const chartData = points.map((p) => ({ ...p, label: fmtDate(p.date) }));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[360px] p-0 rounded-2xl overflow-hidden">
        <div className="max-h-[80vh] overflow-y-auto px-4 pt-5 pb-4">
          <h2 className="font-barlow font-[800] text-xl text-foreground">{meta[cardKey].label.toUpperCase()}</h2>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar mt-3">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1 rounded-full text-[11px] font-dm font-semibold shrink-0 ${
                  range === r.key ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="h-40 mt-4">
            {loading ? (
              <div className="h-full rounded-xl bg-secondary animate-pulse" />
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted font-dm text-center px-6">
                Sem registros nesse período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ left: -20, right: 6, top: 6 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" domain={["auto", "auto"]} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  {cardKey === "blood_pressure" && (
                    <Line type="monotone" dataKey="extra" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                  )}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {canRegister && (
            <div className="border-t border-border mt-4 pt-4">
              <p className="font-barlow font-bold text-sm text-foreground mb-2">Novo registro</p>
              <div className="flex gap-2">
                <input
                  value={v1}
                  onChange={(e) => setV1(e.target.value)}
                  inputMode="decimal"
                  placeholder={cardKey === "blood_pressure" ? "Sistólica" : meta[cardKey].unit}
                  className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm font-dm"
                />
                {cardKey === "blood_pressure" && (
                  <input
                    value={v2}
                    onChange={(e) => setV2(e.target.value)}
                    inputMode="numeric"
                    placeholder="Diastólica"
                    className="flex-1 rounded-xl border border-border px-3 py-2.5 text-sm font-dm"
                  />
                )}
              </div>
              <button
                onClick={save}
                disabled={saving || !v1 || (cardKey === "blood_pressure" && !v2)}
                className="w-full mt-3 bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar registro"}
              </button>
            </div>
          )}

          <div className="border-t border-border mt-4 pt-4">
            <p className="font-barlow font-bold text-sm text-foreground mb-2">Histórico</p>
            {points.length === 0 && <p className="text-xs text-muted font-dm">Nenhum registro.</p>}
            <div className="space-y-1.5">
              {[...points].reverse().map((p, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-dm">
                  <span className="text-muted-foreground">
                    {fmtDate(p.date)}
                    {p.source ? ` · ${p.source === "manual" ? "manual" : p.source}` : ""}
                  </span>
                  <span className="font-semibold text-foreground">
                    {cardKey === "blood_pressure" ? `${p.value}/${p.extra}` : p.value} {meta[cardKey].unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const GoalSheet = ({ current, onClose, onSaved }: { current: number | null; onClose: () => void; onSaved: () => void }) => {
  const { clientId } = useStudentName();
  const [target, setTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!clientId) return;
    setSaving(true);
    await supabase.from("weight_goals").update({ active: false }).eq("client_id", clientId).eq("active", true);
    const { error } = await supabase.from("weight_goals").insert({
      client_id: clientId, target: Number(target.replace(",", ".")), start_value: current, active: true,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Meta definida!");
    onSaved(); onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[340px] rounded-2xl">
        <h2 className="font-barlow font-[800] text-xl text-foreground">META DE PESO</h2>
        <p className="text-xs text-muted font-dm">Peso atual: {current != null ? `${current}kg` : "—"}</p>
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          inputMode="decimal"
          placeholder="Peso desejado (kg)"
          className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm mt-2"
        />
        <button
          onClick={save}
          disabled={saving || !target}
          className="w-full bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar meta"}
        </button>
      </DialogContent>
    </Dialog>
  );
};

const SaudeEvolucaoTab = ({ onBack }: { onBack: () => void }) => {
  const { clientId } = useStudentName();
  const summary = useHealthSummary();
  const [order, setOrder] = useState<CardKey[]>(DEFAULT_ORDER);
  const [reorder, setReorder] = useState(false);
  const [detail, setDetail] = useState<CardKey | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);
  const [view, setView] = useState<"main" | "avaliacoes" | "fotos">("main");

  useEffect(() => {
    if (!clientId) return;
    let alive = true;
    supabase
      .from("student_preferences")
      .select("value")
      .eq("client_id", clientId)
      .eq("key", "health_cards_order")
      .maybeSingle()
      .then(({ data }) => {
        if (!alive || !data) return;
        const saved = (data as { value: any }).value?.order as CardKey[] | undefined;
        if (saved?.length) {
          const merged = [...saved.filter((k) => DEFAULT_ORDER.includes(k)), ...DEFAULT_ORDER.filter((k) => !saved.includes(k))];
          setOrder(merged);
        }
      });
    return () => { alive = false; };
  }, [clientId]);

  const persist = async (next: CardKey[]) => {
    setOrder(next);
    if (!clientId) return;
    await supabase.from("student_preferences").upsert(
      { client_id: clientId, key: "health_cards_order", value: { order: next } as any },
      { onConflict: "client_id,key" }
    );
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next);
  };

  const values = useMemo<Record<CardKey, string>>(() => ({
    weight: summary.weight != null ? `${summary.weight} kg` : "—",
    goal: summary.goal ? `${summary.goal.target} kg` : "definir",
    resting_hr: summary.restingHr != null ? `${summary.restingHr} bpm` : "—",
    blood_pressure: summary.bp ? `${summary.bp.systolic}/${summary.bp.diastolic}` : "—",
    sleep_hours: summary.sleepHours != null ? `${summary.sleepHours} h` : "—",
    sleep_quality: summary.sleepQuality != null ? `${summary.sleepQuality}/5` : "—",
  }), [summary]);

  const remaining =
    summary.weight != null && summary.goal ? Math.round((summary.weight - summary.goal.target) * 10) / 10 : null;

  if (view === "avaliacoes") return <AvaliacoesTab onBack={() => setView("main")} />;
  if (view === "fotos") return <FotosEvolucaoTab onBack={() => setView("main")} />;

  return (
    <div>
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 -ml-1 flex items-center justify-center">
            <ChevronLeft size={22} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-barlow font-bold text-xl text-foreground">SAÚDE & EVOLUÇÃO</h1>
            <p className="text-xs text-muted font-dm">Seus indicadores ao longo do tempo</p>
          </div>
          <button
            onClick={() => setReorder((r) => !r)}
            className={`text-[11px] font-dm font-semibold flex items-center gap-1 ${reorder ? "text-primary" : "text-muted"}`}
          >
            <ArrowUpDown size={14} /> {reorder ? "Pronto" : "Ordenar"}
          </button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {summary.loading &&
          [0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-white card-shadow animate-pulse" />)}

        {!summary.loading &&
          order.map((k, i) => {
            const Icon = meta[k].icon;
            return (
              <div key={k} className="rounded-2xl bg-white card-shadow p-3 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-primary" />
                </span>
                <button
                  onClick={() => (k === "goal" ? setGoalOpen(true) : setDetail(k))}
                  className="flex-1 text-left min-w-0"
                >
                  <p className="font-barlow text-[10px] tracking-[1.5px] uppercase text-muted font-bold">
                    {meta[k].label}
                  </p>
                  <p className="font-barlow font-[800] text-lg text-foreground leading-tight">{values[k]}</p>
                  {k === "goal" && remaining != null && (
                    <p className="text-[11px] text-muted font-dm">
                      {remaining > 0 ? `faltam ${remaining}kg` : "meta alcançada 🎉"}
                    </p>
                  )}
                </button>
                {reorder ? (
                  <div className="flex flex-col">
                    <button onClick={() => move(i, -1)} aria-label="Subir" className="p-0.5">
                      <ChevronUp size={16} className="text-muted" />
                    </button>
                    <button onClick={() => move(i, 1)} aria-label="Descer" className="p-0.5">
                      <ChevronDown size={16} className="text-muted" />
                    </button>
                  </div>
                ) : (
                  <ChevronRight size={16} className="text-muted shrink-0" />
                )}
              </div>
            );
          })}

        <button
          onClick={() => setView("avaliacoes")}
          className="w-full rounded-2xl bg-white card-shadow p-3 flex items-center gap-3 text-left"
        >
          <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardList size={18} className="text-primary" />
          </span>
          <div className="flex-1">
            <p className="font-dm font-semibold text-sm text-foreground">Avaliações físicas</p>
            <p className="text-[11px] text-muted font-dm">Medidas, bioimpedância e comparações</p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>

        <button
          onClick={() => setView("fotos")}
          className="w-full rounded-2xl bg-white card-shadow p-3 flex items-center gap-3 text-left"
        >
          <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Camera size={18} className="text-primary" />
          </span>
          <div className="flex-1">
            <p className="font-dm font-semibold text-sm text-foreground">Fotos de evolução</p>
            <p className="text-[11px] text-muted font-dm">Privadas · só você tem acesso</p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </button>
      </div>

      {detail && <DetailSheet cardKey={detail} onClose={() => setDetail(null)} onSaved={summary.reload} />}
      {goalOpen && <GoalSheet current={summary.weight} onClose={() => setGoalOpen(false)} onSaved={summary.reload} />}
    </div>
  );
};

export default SaudeEvolucaoTab;
