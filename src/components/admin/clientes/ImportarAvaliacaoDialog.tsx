import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, FileText, Loader2, Upload } from "lucide-react";
import { logAudit } from "@/lib/audit";

const MAX_MB = 10;
const ACCEPT = "application/pdf,image/png,image/jpeg";

type Field = { key: string; label: string; unit?: string; text?: boolean };

const BLOCKS: { title: string; fields: Field[] }[] = [
  {
    title: "Identificação",
    fields: [
      { key: "student_name", label: "Nome no laudo", text: true },
      { key: "device_client_id", label: "ID no equipamento", text: true },
      { key: "measured_at", label: "Data e hora", text: true },
      { key: "sex", label: "Sexo", text: true },
      { key: "age", label: "Idade" },
      { key: "height_cm", label: "Altura", unit: "cm" },
      { key: "device_model", label: "Equipamento/modelo", text: true },
    ],
  },
  {
    title: "Composição corporal",
    fields: [
      { key: "weight", label: "Peso", unit: "kg" },
      { key: "total_body_water", label: "Água corporal total", unit: "L" },
      { key: "protein", label: "Proteína", unit: "kg" },
      { key: "minerals", label: "Minerais", unit: "kg" },
      { key: "fat_mass", label: "Massa de gordura", unit: "kg" },
      { key: "lean_mass", label: "Massa livre de gordura", unit: "kg" },
      { key: "skeletal_muscle_mass", label: "Massa muscular esquelética", unit: "kg" },
      { key: "muscle_mass", label: "Massa muscular", unit: "kg" },
      { key: "body_fat_pct", label: "Gordura corporal", unit: "%" },
      { key: "body_water", label: "Água corporal", unit: "%" },
    ],
  },
  {
    title: "Indicadores metabólicos",
    fields: [
      { key: "bmi", label: "IMC" },
      { key: "basal_metabolism", label: "Taxa metabólica basal", unit: "kcal" },
      { key: "waist_hip_ratio", label: "Relação cintura-quadril" },
      { key: "visceral_fat", label: "Gordura visceral" },
      { key: "obesity_degree", label: "Grau de obesidade", unit: "%" },
      { key: "inbody_score", label: "Pontuação InBody" },
    ],
  },
  {
    title: "Controle de peso",
    fields: [
      { key: "ideal_weight", label: "Peso ideal", unit: "kg" },
      { key: "weight_control", label: "Controle de peso", unit: "kg" },
      { key: "fat_control", label: "Controle de gordura", unit: "kg" },
      { key: "muscle_control", label: "Controle muscular", unit: "kg" },
    ],
  },
  {
    title: "Análise segmentar",
    fields: [
      { key: "lean_arm_left", label: "Massa magra braço esq.", unit: "kg" },
      { key: "lean_arm_right", label: "Massa magra braço dir.", unit: "kg" },
      { key: "lean_trunk", label: "Massa magra tronco", unit: "kg" },
      { key: "lean_leg_left", label: "Massa magra perna esq.", unit: "kg" },
      { key: "lean_leg_right", label: "Massa magra perna dir.", unit: "kg" },
      { key: "fat_arm_left", label: "Gordura braço esq.", unit: "kg" },
      { key: "fat_arm_right", label: "Gordura braço dir.", unit: "kg" },
      { key: "fat_trunk", label: "Gordura tronco", unit: "kg" },
      { key: "fat_leg_left", label: "Gordura perna esq.", unit: "kg" },
      { key: "fat_leg_right", label: "Gordura perna dir.", unit: "kg" },
    ],
  },
];

const NUM_KEYS = BLOCKS.flatMap(b => b.fields.filter(f => !f.text).map(f => f.key));

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z ]/g, "").trim();

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function ImportarAvaliacaoDialog({
  clientId, clientName, onClose, onSaved,
}: { clientId: number; clientName: string; onClose: () => void; onSaved: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [lowConf, setLowConf] = useState<string[]>([]);
  const [step, setStep] = useState<"upload" | "review">("upload");
  const [measuredAt, setMeasuredAt] = useState("");
  const [notes, setNotes] = useState("");
  const [nameWarn, setNameWarn] = useState<string | null>(null);
  const [dupWarn, setDupWarn] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (f: File | null) => {
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) { toast.error("Envie um arquivo PDF, PNG ou JPG."); return; }
    if (f.size > MAX_MB * 1024 * 1024) { toast.error(`Arquivo maior que ${MAX_MB} MB.`); return; }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const read = async () => {
    if (!file) return;
    setReading(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] || "");
        r.onerror = () => rej(new Error("read"));
        r.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("assessment-ocr", {
        body: { fileBase64: base64, mime: file.type, fileName: file.name },
      });
      if (error || !(data as any)?.ok) {
        let msg = (data as any)?.error || "Não foi possível ler o documento.";
        const ctx = (error as any)?.context;
        if (ctx?.json) { try { msg = (await ctx.json()).error || msg; } catch { /* noop */ } }
        toast.error(msg);
        setReading(false);
        return;
      }
      const d = (data as any).data as Record<string, any>;
      const v: Record<string, string> = {};
      Object.entries(d).forEach(([k, val]) => {
        if (k === "low_confidence") return;
        v[k] = val == null ? "" : String(val).replace(",", ".");
      });
      setValues(v);
      setLowConf(Array.isArray(d.low_confidence) ? d.low_confidence : []);
      const at = toLocalInput(d.measured_at || null);
      setMeasuredAt(at);

      if (d.student_name) {
        const match = samePerson(String(d.student_name), clientName);
        setNameWarn(match ? null : `O laudo está no nome de "${d.student_name}", diferente de ${clientName}.`);
      }

      if (at) {
        const day = at.slice(0, 10);
        const { data: dups } = await supabase
          .from("physical_assessments")
          .select("id, performed_at")
          .eq("client_id", clientId)
          .gte("performed_at", `${day}T00:00:00`)
          .lte("performed_at", `${day}T23:59:59`);
        if (dups && dups.length) setDupWarn("Já existe uma avaliação registrada nesta mesma data para o aluno.");
      }
      setStep("review");
    } catch {
      toast.error("Falha ao processar o arquivo.");
    }
    setReading(false);
  };

  const set = (k: string, v: string) => setValues(s => ({ ...s, [k]: v }));

  const bioPayload = useMemo(() => {
    const p: Record<string, string> = {};
    NUM_KEYS.forEach(k => { if ((values[k] || "").trim() !== "") p[k] = values[k].replace(",", "."); });
    ["sex", "device_model", "device_client_id"].forEach(k => { if ((values[k] || "").trim()) p[k] = values[k].trim(); });
    return p;
  }, [values]);

  const save = async () => {
    if (!file) return;
    if (!measuredAt) { toast.error("Informe a data e hora da avaliação."); return; }
    setSaving(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${clientId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avaliacoes").upload(path, file, { contentType: file.type });
      if (up.error) { toast.error("Não foi possível anexar o arquivo."); setSaving(false); return; }

      const { data, error } = await supabase.rpc("assessment_import_save" as any, {
        _client_id: clientId,
        _performed_at: new Date(measuredAt).toISOString(),
        _notes: notes.trim() || null,
        _bio: bioPayload,
        _measures: {},
        _file: { path, name: file.name, mime: file.type, size: String(file.size), low_confidence: lowConf },
      });
      const res = data as any;
      if (error || !res?.ok) {
        toast.error(res?.reason === "forbidden" ? "Sem permissão para importar avaliações." : error?.message || "Não foi possível salvar.");
        setSaving(false);
        return;
      }
      await logAudit({
        action: "create", entity: "physical_assessments", entity_id: res.id,
        module: "avaliacao",
        description: `Avaliação importada de laudo para ${clientName}`,
        metadata: { file: file.name, low_confidence: lowConf, name_warning: nameWarn },
        after: bioPayload,
      });
      toast.success("Avaliação importada e salva no histórico do aluno.");
      onSaved();
      onClose();
    } catch {
      toast.error("Falha ao salvar a avaliação.");
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-barlow">IMPORTAR AVALIAÇÃO</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-3">
            <p className="text-sm font-dm text-muted-foreground">
              Envie o laudo de bioimpedância de {clientName} em PDF, PNG ou JPG (até {MAX_MB} MB).
            </p>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0] || null); }}
              onClick={() => inputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                dragging ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <Upload className="mx-auto mb-2 text-muted-foreground" size={22} />
              <p className="text-sm font-dm text-foreground">
                {file ? file.name : "Clique ou arraste o arquivo aqui"}
              </p>
              <p className="text-[11px] font-dm text-muted-foreground mt-1">PDF, PNG ou JPG</p>
              <input ref={inputRef} type="file" accept={ACCEPT} className="hidden"
                onChange={e => pick(e.target.files?.[0] || null)} />
            </div>
            {file && preview && (
              <div className="rounded-xl border border-border overflow-hidden h-56">
                {file.type.includes("pdf")
                  ? <iframe src={preview} title="laudo" className="w-full h-full" />
                  : <img src={preview} alt="Laudo enviado" className="w-full h-full object-contain bg-muted/30" />}
              </div>
            )}
          </div>
        )}

        {step === "review" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3 order-2 md:order-1">
              {(nameWarn || dupWarn) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
                  {nameWarn && (
                    <p className="text-xs font-dm text-amber-800 flex gap-1.5"><AlertTriangle size={14} /> {nameWarn}</p>
                  )}
                  {dupWarn && (
                    <p className="text-xs font-dm text-amber-800 flex gap-1.5"><AlertTriangle size={14} /> {dupWarn}</p>
                  )}
                  <p className="text-[11px] font-dm text-amber-700">Confira os dados; você pode continuar se estiver correto.</p>
                </div>
              )}

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-1">
                  Data e hora da avaliação
                </p>
                <Input type="datetime-local" value={measuredAt} onChange={e => setMeasuredAt(e.target.value)}
                  className="h-9 font-dm" />
              </div>

              {BLOCKS.map(b => (
                <div key={b.title} className="rounded-xl border border-border p-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-2">{b.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {b.fields.map(f => {
                      const low = lowConf.includes(f.key);
                      return (
                        <div key={f.key}>
                          <p className={`text-[11px] font-dm ${low ? "text-amber-700" : "text-muted-foreground"}`}>
                            {f.label}{f.unit ? ` (${f.unit})` : ""}{low ? " · confirmar" : ""}
                          </p>
                          <Input
                            inputMode={f.text ? "text" : "decimal"}
                            value={values[f.key] || ""}
                            onChange={e => set(f.key, e.target.value)}
                            placeholder="—"
                            className={`h-9 font-dm ${low ? "border-amber-400 bg-amber-50" : ""}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-1">Observações</p>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="font-dm" />
              </div>
            </div>

            <div className="order-1 md:order-2">
              <div className="md:sticky md:top-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm mb-2 flex items-center gap-1.5">
                  <FileText size={12} /> Arquivo original · {file?.name}
                </p>
                <div className="rounded-xl border border-border overflow-hidden h-[60vh] bg-muted/30">
                  {preview && (file?.type.includes("pdf")
                    ? <iframe src={preview} title="laudo" className="w-full h-full" />
                    : <img src={preview} alt="Laudo enviado" className="w-full h-full object-contain" />)}
                </div>
                <p className="text-[11px] font-dm text-muted-foreground mt-2">
                  Campos não encontrados ficam vazios — nada é calculado automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="font-dm" onClick={onClose}>Cancelar</Button>
          {step === "upload" ? (
            <Button className="font-dm" onClick={read} disabled={!file || reading}>
              {reading ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> LENDO LAUDO...</> : "LER DOCUMENTO"}
            </Button>
          ) : (
            <Button className="font-dm" onClick={save} disabled={saving}>
              {saving ? "SALVANDO..." : "CONFIRMAR E SALVAR"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
