import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileSpreadsheet } from "lucide-react";
import { STATUS_FUNIL, brTimestamp, normalizeCadastrador, normalizeOrigem, onlyDigits } from "@/lib/leads";

const REQUIRED = ["nome_completo", "telefone", "origem", "atendido_por", "status_funil", "data_cadastro"];

const rowSchema = z.object({
  nome_completo: z.string().trim().min(3, "nome inválido"),
  telefone: z.string().refine((v) => [10, 11].includes(onlyDigits(v).length), "telefone deve ter 10 ou 11 dígitos"),
  origem: z.string().trim().min(1, "origem vazia"),
  atendido_por: z.string().trim().min(1, "atendido_por vazio"),
  status_funil: z.string().trim().min(1, "status_funil vazio"),
  data_cadastro: z.string().trim().min(1, "data_cadastro vazia"),
});

type Valid = {
  nome: string; telefone: string; origem: string; atendido_por: string;
  status_funil: string; created_at: string;
};
type Rejected = { linha: number; motivo: string };

const parseDate = (v: any): string | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
};

const mapStatus = (v: string) => {
  const s = v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "_");
  if ((STATUS_FUNIL as readonly string[]).includes(s)) return s;
  if (/converti|matricul/.test(s)) return "convertido";
  if (/perdid/.test(s)) return "perdido";
  if (/negocia/.test(s)) return "negociacao";
  if (/follow/.test(s)) return "follow_up";
  if (/realizad/.test(s)) return "aula_realizada";
  if (/agendad/.test(s)) return "aula_agendada";
  if (/contato/.test(s)) return "contato_inicial";
  return "novo";
};

type Props = { open: boolean; onOpenChange: (v: boolean) => void; unidadeId: string; onDone: () => void };

const ImportLeadsDialog = ({ open, onOpenChange, unidadeId, onDone }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<any[]>([]);
  const [valids, setValids] = useState<Valid[]>([]);
  const [rejected, setRejected] = useState<Rejected[]>([]);
  const [previewed, setPreviewed] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => { setRows([]); setValids([]); setRejected([]); setPreviewed(false); setFileName(""); };

  const pick = async (f: File) => {
    reset();
    setFileName(f.name);
    const buf = await f.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<any>(sheet, { defval: "" });
    if (!data.length) return toast.error("Planilha vazia.");
    const cols = Object.keys(data[0]).map((c) => c.trim().toLowerCase());
    const missing = REQUIRED.filter((r) => !cols.includes(r));
    if (missing.length) return toast.error("Colunas obrigatórias ausentes: " + missing.join(", "));
    setRows(data);
    toast.success(`${data.length} linhas lidas. Clique em Pré-visualizar.`);
  };

  const preview = () => {
    const seen = new Set<string>();
    const ok: Valid[] = [];
    const bad: Rejected[] = [];
    rows.forEach((r, idx) => {
      const norm: any = {};
      Object.keys(r).forEach((k) => { norm[k.trim().toLowerCase()] = typeof r[k] === "string" ? r[k].trim() : r[k]; });
      const parsed = rowSchema.safeParse({
        nome_completo: String(norm.nome_completo ?? ""),
        telefone: String(norm.telefone ?? ""),
        origem: String(norm.origem ?? ""),
        atendido_por: String(norm.atendido_por ?? ""),
        status_funil: String(norm.status_funil ?? ""),
        data_cadastro: String(norm.data_cadastro ?? ""),
      });
      if (!parsed.success) {
        bad.push({ linha: idx + 2, motivo: parsed.error.issues.map((i) => i.message).join("; ") });
        return;
      }
      const tel = onlyDigits(parsed.data.telefone);
      if (seen.has(tel)) { bad.push({ linha: idx + 2, motivo: "telefone repetido no próprio arquivo" }); return; }
      const dia = parseDate(norm.data_cadastro);
      if (!dia) { bad.push({ linha: idx + 2, motivo: "data_cadastro inválida (use dd/MM/yyyy)" }); return; }
      seen.add(tel);
      ok.push({
        nome: parsed.data.nome_completo.replace(/\s+/g, " "),
        telefone: tel,
        origem: normalizeOrigem(parsed.data.origem),
        atendido_por: normalizeCadastrador(parsed.data.atendido_por),
        status_funil: mapStatus(parsed.data.status_funil),
        created_at: brTimestamp(dia, "12:00"),
      });
    });
    setValids(ok); setRejected(bad); setPreviewed(true);
  };

  const importar = async () => {
    setBusy(true);
    const { data: existing } = await supabase
      .from("leads").select("telefone_normalizado").eq("unidade_id", unidadeId);
    const already = new Set(((existing || []) as any[]).map((e) => e.telefone_normalizado));
    const toInsert = valids.filter((v) => !already.has(v.telefone));
    const duplicados = valids.length - toInsert.length;
    let importados = 0, falharam = 0;

    for (let i = 0; i < toInsert.length; i += 100) {
      const batch = toInsert.slice(i, i + 100).map((v) => ({
        unidade_id: unidadeId,
        nome: v.nome,
        telefone: v.telefone,
        origem: v.origem,
        status_funil: v.status_funil as any,
        atendido_por: v.atendido_por,
        cadastrado_por: v.atendido_por,
        created_at: v.created_at,
      }));
      const { error, data } = await supabase.from("leads").insert(batch).select("id");
      if (error) falharam += batch.length; else importados += data?.length || batch.length;
    }
    setBusy(false);
    toast.success(`Importados: ${importados} • Rejeitados: ${rejected.length} • Duplicados: ${duplicados} • Falharam: ${falharam}`);
    onOpenChange(false);
    reset();
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Importar planilha de leads</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-dashed p-4 text-sm">
            <p className="font-medium mb-1">Colunas obrigatórias</p>
            <p className="text-muted-foreground">{REQUIRED.join(", ")}</p>
          </div>

          <input ref={fileRef} type="file" accept=".csv,.xlsx" className="hidden"
            onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
            <FileSpreadsheet size={16} className="mr-2" />
            {fileName || "Selecionar arquivo CSV ou XLSX"}
          </Button>

          {previewed && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-semibold">{rows.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Válidas</p><p className="text-2xl font-semibold text-emerald-600">{valids.length}</p></div>
                <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Rejeitadas</p><p className="text-2xl font-semibold text-destructive">{rejected.length}</p></div>
              </div>

              {!!rejected.length && (
                <div className="max-h-40 overflow-y-auto rounded-lg border text-sm">
                  {rejected.map((r) => (
                    <div key={r.linha} className="flex gap-2 border-b px-3 py-1.5 last:border-0">
                      <span className="text-muted-foreground">Linha {r.linha}</span>
                      <span className="text-destructive">{r.motivo}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="max-h-52 overflow-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr><th className="p-2 text-left">Nome</th><th className="p-2 text-left">Telefone</th><th className="p-2 text-left">Origem</th><th className="p-2 text-left">Status</th></tr>
                  </thead>
                  <tbody>
                    {valids.slice(0, 20).map((v, i) => (
                      <tr key={i} className="border-t"><td className="p-2">{v.nome.toUpperCase()}</td><td className="p-2">{v.telefone}</td><td className="p-2">{v.origem}</td><td className="p-2">{v.status_funil}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button variant="outline" onClick={preview} disabled={!rows.length}>Pré-visualizar</Button>
          <Button onClick={importar} disabled={!previewed || !valids.length || busy}>
            <Upload size={16} className="mr-2" />{busy ? "Importando..." : `Importar ${valids.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportLeadsDialog;
