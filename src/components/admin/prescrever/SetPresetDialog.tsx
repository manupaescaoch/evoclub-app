import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const SET_TYPES = [
  { value: "reps_load", label: "Repetições e carga" },
  { value: "reps_load_time", label: "Repetições, carga e tempo" },
  { value: "reps_time", label: "Repetições e tempo" },
  { value: "time_incline", label: "Tempo e inclinação" },
  { value: "run", label: "Corrida" },
  { value: "cadence", label: "Cadência" },
  { value: "notes_only", label: "Observações" },
];

export type PresetSetRow = {
  sets: number; reps: string; load: string; rest_seconds: number;
  time_seconds: number | null; incline: string; cadence: string;
  distance_km: string; pace: string; notes: string;
};

export type PresetRecord = {
  id: string; name: string; set_type: string; sets: PresetSetRow[];
};

const emptyRow = (): PresetSetRow => ({
  sets: 1, reps: "12", load: "", rest_seconds: 60, time_seconds: null,
  incline: "", cadence: "", distance_km: "", pace: "", notes: "",
});

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (preset: PresetRecord) => void;
  initialMode?: "picker" | "create";
  prefillName?: string;
  prefillSetType?: string;
  prefillSets?: PresetSetRow[];
};

export default function SetPresetDialog({
  open, onClose, onApply,
  initialMode = "picker", prefillName = "", prefillSetType = "reps_load", prefillSets,
}: Props) {
  const [mode, setMode] = useState<"picker" | "create">(initialMode);
  const [presets, setPresets] = useState<PresetRecord[]>([]);
  const [search, setSearch] = useState("");
  const [name, setName] = useState(prefillName);
  const [setType, setSetType] = useState(prefillSetType);
  const [rows, setRows] = useState<PresetSetRow[]>(prefillSets?.length ? prefillSets : [emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<PresetRecord | null>(null);

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setName(prefillName); setSetType(prefillSetType);
      setRows(prefillSets?.length ? prefillSets : [emptyRow()]);
      setSearch(""); setPreview(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const load = async () => {
    const { data } = await supabase.from("training_set_presets").select("*").order("name");
    setPresets((data || []) as any);
  };

  const filtered = presets.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!name.trim()) { toast.error("Informe o nome do preset"); return; }
    if (!rows.length) { toast.error("Adicione ao menos uma série"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("training_set_presets")
      .insert({ name: name.trim(), set_type: setType, sets: rows as any })
      .select("*").single();
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Preset salvo!");
    onApply(data as any);
    onClose();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este preset?")) return;
    const { error } = await supabase.from("training_set_presets").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setPresets(p => p.filter(x => x.id !== id));
  };

  const fields = FIELDS_BY_TYPE[setType] || FIELDS_BY_TYPE.reps_load;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-barlow font-bold">
            {mode === "picker" ? "Adicionar preset" : "Novo preset"}
          </DialogTitle>
        </DialogHeader>

        {mode === "picker" && (
          <div className="space-y-3">
            <p className="text-xs font-dm text-muted-foreground">Selecione um preset para acelerar a montagem do treino.</p>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquise por nome" className="pl-9" />
            </div>
            <Button variant="outline" className="w-full font-dm text-primary border-primary hover:bg-primary/5" onClick={() => setMode("create")}>
              Criar novo preset
            </Button>
            <div>
              <p className="text-sm font-dm font-semibold mb-2">Seus presets</p>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {filtered.length === 0 && (
                  <p className="text-xs font-dm text-muted-foreground text-center py-4">Nenhum preset salvo ainda.</p>
                )}
                {filtered.map(p => (
                  <div key={p.id} className="border border-border rounded-lg px-3 py-2.5 flex items-center justify-between gap-2 bg-card">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-dm font-medium truncate">{p.name}</p>
                      <button onClick={() => setPreview(preview?.id === p.id ? null : p)} className="text-xs font-dm text-primary hover:underline">
                        {preview?.id === p.id ? "Ocultar" : "Ver preset"}
                      </button>
                      {preview?.id === p.id && (
                        <div className="mt-2 text-[11px] font-dm text-muted-foreground space-y-0.5">
                          <div>Tipo: {SET_TYPES.find(t => t.value === p.set_type)?.label || p.set_type}</div>
                          {p.sets.map((s, i) => (
                            <div key={i}>• {s.sets}x{s.reps || "—"} {s.load && `· ${s.load}`} {s.rest_seconds ? `· int ${s.rest_seconds}s` : ""}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => remove(p.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Excluir">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => { onApply(p); onClose(); }} className="p-1.5 text-primary hover:bg-primary/5 rounded" title="Adicionar">
                      <Plus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {mode === "create" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-dm">Nome do preset</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: 3x8-12" />
            </div>
            <div>
              <Label className="text-xs font-dm">Tipo da série</Label>
              <select value={setType} onChange={e => setSetType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-background border border-border rounded font-dm focus:outline-none focus:ring-1 focus:ring-primary">
                {SET_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-dm">Séries</Label>
              {rows.map((r, idx) => (
                <div key={idx} className="flex items-end gap-2">
                  {fields.notesOnly ? (
                    <div className="flex-1">
                      <Input value={r.notes} onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, notes: e.target.value } : x))} placeholder="Observação livre" />
                    </div>
                  ) : (
                    <>
                      {fields.sets && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Séries</label>
                          <Input type="number" min={1} value={r.sets}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, sets: parseInt(e.target.value) || 1 } : x))} />
                        </div>
                      )}
                      {fields.reps && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Reps</label>
                          <Input value={r.reps}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, reps: e.target.value } : x))} placeholder="12" />
                        </div>
                      )}
                      {fields.load && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Carga</label>
                          <Input value={r.load}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, load: e.target.value } : x))} placeholder="40kg" />
                        </div>
                      )}
                      {fields.time && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Tempo (s)</label>
                          <Input type="number" value={r.time_seconds ?? ""}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, time_seconds: parseInt(e.target.value) || null } : x))} />
                        </div>
                      )}
                      {fields.incline && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Incl %</label>
                          <Input value={r.incline}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, incline: e.target.value } : x))} />
                        </div>
                      )}
                      {fields.distance && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Dist km</label>
                          <Input value={r.distance_km}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, distance_km: e.target.value } : x))} />
                        </div>
                      )}
                      {fields.pace && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Ritmo</label>
                          <Input value={r.pace}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, pace: e.target.value } : x))} placeholder="min/km" />
                        </div>
                      )}
                      {fields.cadence && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Cadência</label>
                          <Input value={r.cadence}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, cadence: e.target.value } : x))} placeholder="3-0-1-0" />
                        </div>
                      )}
                      {fields.rest && (
                        <div className="flex-1">
                          <label className="text-[10px] font-dm text-muted-foreground block">Intervalo</label>
                          <Input type="number" value={r.rest_seconds}
                            onChange={e => setRows(rs => rs.map((x, i) => i === idx ? { ...x, rest_seconds: parseInt(e.target.value) || 0 } : x))} />
                        </div>
                      )}
                    </>
                  )}
                  <button onClick={() => setRows(rs => rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setRows(rs => [...rs, emptyRow()])} className="w-full font-dm">
                <Plus size={14} className="mr-1" /> Adicionar série
              </Button>
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t border-border">
              <Button variant="outline" onClick={() => initialMode === "picker" ? setMode("picker") : onClose()} className="font-dm">
                Cancelar
              </Button>
              <Button onClick={save} disabled={saving} className="font-dm">
                {saving ? "Salvando..." : "Salvar preset"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const FIELDS_BY_TYPE: Record<string, {
  sets?: boolean; reps?: boolean; load?: boolean; rest?: boolean;
  time?: boolean; incline?: boolean; distance?: boolean; pace?: boolean; cadence?: boolean;
  notesOnly?: boolean;
}> = {
  reps_load:      { sets: true, reps: true, load: true, rest: true },
  reps_load_time: { sets: true, reps: true, load: true, time: true, rest: true },
  reps_time:      { sets: true, reps: true, time: true, rest: true },
  time_incline:   { sets: true, time: true, incline: true, rest: true },
  run:            { sets: true, distance: true, time: true, pace: true, rest: true },
  cadence:        { sets: true, reps: true, load: true, cadence: true, rest: true },
  notes_only:     { notesOnly: true },
};