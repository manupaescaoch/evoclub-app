import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ClipboardList, CalendarPlus, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useStudentName } from "@/hooks/useStudentName";

export const MEASURE_KEYS = [
  { key: "torax", label: "Tórax" },
  { key: "cintura", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "quadril", label: "Quadril" },
  { key: "braco_direito", label: "Braço direito" },
  { key: "braco_esquerdo", label: "Braço esquerdo" },
  { key: "perna_direita", label: "Perna direita" },
  { key: "perna_esquerda", label: "Perna esquerda" },
  { key: "panturrilha_direita", label: "Panturrilha direita" },
  { key: "panturrilha_esquerda", label: "Panturrilha esquerda" },
] as const;

const BIO_FIELDS = [
  { key: "weight", label: "Peso", unit: "kg" },
  { key: "body_fat_pct", label: "Gordura", unit: "%" },
  { key: "fat_mass", label: "Massa de gordura", unit: "kg" },
  { key: "muscle_mass", label: "Massa muscular", unit: "kg" },
  { key: "lean_mass", label: "Massa magra", unit: "kg" },
  { key: "body_water", label: "Água corporal", unit: "%" },
  { key: "visceral_fat", label: "Gordura visceral", unit: "" },
  { key: "basal_metabolism", label: "Metabolismo basal", unit: "kcal" },
  { key: "bmi", label: "IMC", unit: "" },
] as const;

type Assessment = {
  id: string;
  scheduled_at: string | null;
  performed_at: string | null;
  professional_name: string | null;
  status: string;
  notes: string | null;
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";

const AvaliacoesTab = ({ onBack }: { onBack: () => void }) => {
  const { clientId, name } = useStudentName();
  const [items, setItems] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [date, setDate] = useState("");
  const [detail, setDetail] = useState<Assessment | null>(null);
  const [measures, setMeasures] = useState<Record<string, number>>({});
  const [bio, setBio] = useState<any | null>(null);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    const { data } = await supabase
      .from("physical_assessments")
      .select("id, scheduled_at, performed_at, professional_name, status, notes")
      .eq("client_id", clientId)
      .order("scheduled_at", { ascending: false, nullsFirst: false });
    setItems((data || []) as Assessment[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (a: Assessment) => {
    setDetail(a);
    setMeasures({});
    setBio(null);
    const [m, b] = await Promise.all([
      supabase.from("assessment_measures").select("measure_key, value").eq("assessment_id", a.id),
      supabase.from("assessment_bioimpedance").select("*").eq("assessment_id", a.id).maybeSingle(),
    ]);
    const map: Record<string, number> = {};
    ((m.data || []) as { measure_key: string; value: number }[]).forEach((r) => {
      if (r.value != null) map[r.measure_key] = Number(r.value);
    });
    setMeasures(map);
    setBio(b.data);
  };

  const schedule = async () => {
    if (!clientId || !date) return;
    const { error } = await supabase.from("physical_assessments").insert({
      client_id: clientId,
      scheduled_at: new Date(`${date}T09:00:00`).toISOString(),
      status: "agendada",
      notes: `Solicitado pelo aluno ${name}`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Avaliação solicitada! A equipe confirmará o horário.");
    setScheduleOpen(false);
    setDate("");
    load();
  };

  const done = items.filter((i) => i.performed_at);
  const last = done[0] || null;
  const next = items
    .filter((i) => !i.performed_at && i.scheduled_at)
    .sort((a, b) => (a.scheduled_at! > b.scheduled_at! ? 1 : -1))[0] || null;
  const overdue = !next && last && new Date(last.performed_at!) < new Date(Date.now() - 90 * 864e5);

  return (
    <div>
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 -ml-1 flex items-center justify-center">
            <ChevronLeft size={22} className="text-foreground" />
          </button>
          <div>
            <h1 className="font-barlow font-bold text-xl text-foreground">AVALIAÇÕES FÍSICAS</h1>
            <p className="text-xs text-muted font-dm">Medidas, bioimpedância e evolução</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading && <div className="h-20 rounded-2xl bg-white card-shadow animate-pulse" />}

        {!loading && (
          <>
            {overdue && (
              <div className="rounded-2xl bg-white card-shadow p-4 border-l-4 border-l-yellow-500">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-600" />
                  <p className="font-barlow font-bold text-sm text-foreground">AVALIAÇÃO VENCIDA</p>
                </div>
                <p className="text-xs text-muted font-dm mt-1">
                  Sua última avaliação foi em {fmt(last!.performed_at)}.
                </p>
              </div>
            )}

            <div className="rounded-2xl bg-white card-shadow p-4">
              <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">PRÓXIMA AVALIAÇÃO</p>
              <p className="font-barlow font-[800] text-xl text-foreground">
                {next ? fmt(next.scheduled_at) : "Não agendada"}
              </p>
              {next?.professional_name && (
                <p className="text-xs text-muted font-dm">com {next.professional_name}</p>
              )}
              <button
                onClick={() => setScheduleOpen(true)}
                className="w-full mt-3 bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow flex items-center justify-center gap-2"
              >
                <CalendarPlus size={16} /> Agendar avaliação
              </button>
            </div>

            <div className="rounded-2xl bg-white card-shadow p-4">
              <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold mb-2">HISTÓRICO</p>
              {done.length === 0 && (
                <p className="text-xs text-muted font-dm">Nenhuma avaliação realizada ainda.</p>
              )}
              <div className="space-y-2">
                {done.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => openDetail(a)}
                    className="w-full flex items-center gap-3 text-left"
                  >
                    <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <ClipboardList size={16} className="text-primary" />
                    </span>
                    <div className="flex-1">
                      <p className="font-dm text-sm text-foreground font-semibold">{fmt(a.performed_at)}</p>
                      <p className="text-[11px] text-muted font-dm">{a.professional_name || "Equipe EVO"}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-[340px] rounded-2xl">
          <h2 className="font-barlow font-[800] text-xl text-foreground">AGENDAR AVALIAÇÃO</h2>
          <p className="text-xs text-muted font-dm">Escolha uma data. A equipe confirma o horário.</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm"
          />
          <button
            onClick={schedule}
            disabled={!date}
            className="w-full bg-primary text-white font-dm font-bold text-sm py-3 rounded-xl cta-shadow disabled:opacity-50"
          >
            Solicitar agendamento
          </button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null); }}>
        <DialogContent className="max-w-[360px] p-0 rounded-2xl overflow-hidden">
          <div className="max-h-[80vh] overflow-y-auto px-4 pt-5 pb-4">
            <h2 className="font-barlow font-[800] text-xl text-foreground">
              AVALIAÇÃO {fmt(detail?.performed_at ?? null)}
            </h2>
            <p className="text-xs text-muted font-dm">{detail?.professional_name || "Equipe EVO"}</p>

            <div className="border-t border-border mt-4 pt-4">
              <p className="font-barlow font-bold text-sm text-foreground mb-2">Medidas (cm)</p>
              {MEASURE_KEYS.map((m) => (
                <div key={m.key} className="flex items-center justify-between text-xs font-dm py-1">
                  <span className="text-muted-foreground">{m.label}</span>
                  <span className="font-semibold text-foreground">{measures[m.key] ?? "—"}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border mt-4 pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-barlow font-bold text-sm text-foreground">Bioimpedância</p>
                {bio?.origin && (
                  <span className="text-[9px] font-barlow font-bold tracking-[1px] uppercase bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">
                    {bio.origin}
                  </span>
                )}
              </div>
              {!bio && <p className="text-xs text-muted font-dm">Sem dados de bioimpedância.</p>}
              {bio &&
                BIO_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center justify-between text-xs font-dm py-1">
                    <span className="text-muted-foreground">{f.label}</span>
                    <span className="font-semibold text-foreground">
                      {bio[f.key] != null ? `${bio[f.key]} ${f.unit}` : "—"}
                    </span>
                  </div>
                ))}
            </div>

            {detail?.notes && (
              <div className="border-t border-border mt-4 pt-4">
                <p className="font-barlow font-bold text-sm text-foreground mb-1">Observações</p>
                <p className="text-xs text-muted-foreground font-dm">{detail.notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AvaliacoesTab;
