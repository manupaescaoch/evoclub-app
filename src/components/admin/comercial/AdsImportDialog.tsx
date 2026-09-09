import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload } from "lucide-react";
import { useUnit } from "@/contexts/UnitContext";

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const MAP: Record<string, string> = {
  data: "date", dia: "date", date: "date", day: "date", reporting_starts: "date",
  plataforma: "platform", platform: "platform",
  conta: "ad_account", conta_de_anuncios: "ad_account", ad_account_name: "ad_account", account_name: "ad_account",
  campanha: "campaign", nome_da_campanha: "campaign", campaign_name: "campaign", campaign: "campaign",
  conjunto: "adset", nome_do_conjunto_de_anuncios: "adset", ad_set_name: "adset", adset_name: "adset",
  anuncio: "ad", nome_do_anuncio: "ad", ad_name: "ad", ad: "ad",
  status: "status", veiculacao: "status",
  valor_usado: "spend", valor_gasto: "spend", investimento: "spend", amount_spent: "spend", cost: "spend", spend: "spend",
  alcance: "reach", reach: "reach",
  impressoes: "impressions", impressions: "impressions", impr: "impressions",
  cliques: "clicks", cliques_no_link: "clicks", clicks: "clicks", link_clicks: "clicks",
  conversas: "conversations", conversas_iniciadas: "conversations",
  conversas_por_mensagem_iniciadas: "conversations", messaging_conversations_started: "conversations",
  leads: "conversations",
};

const numBR = (v: string) => {
  const t = (v || "").replace(/[R$\s%"]/g, "");
  if (!t) return 0;
  const clean = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
};

const parseDate = (v: string) => {
  const t = (v || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return "";
};

const splitLine = (line: string, sep: string) => {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (ch === sep && !quoted) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
};

export default function AdsImportDialog({
  open, onOpenChange, onDone,
}: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const { units, filterId } = useUnit();
  const [unidade, setUnidade] = useState(filterId || units[0]?.id || "");
  const [plataforma, setPlataforma] = useState("Meta Ads");
  const [rows, setRows] = useState<any[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return toast.error("Arquivo vazio");
    const sep = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ";" : ",";
    const header = splitLine(lines[0], sep).map((h) => MAP[norm(h)] || norm(h));
    const parsed: any[] = [];
    const problemas: string[] = [];
    lines.slice(1).forEach((line, idx) => {
      const cells = splitLine(line, sep);
      const obj: any = {};
      header.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
      const date = parseDate(obj.date);
      if (!date) { problemas.push(`Linha ${idx + 2}: data inválida`); return; }
      parsed.push({
        unit_id: unidade || null,
        date,
        platform: obj.platform || plataforma,
        ad_account: obj.ad_account || null,
        campaign: obj.campaign || null,
        adset: obj.adset || null,
        ad: obj.ad || null,
        status: obj.status || null,
        spend: numBR(obj.spend),
        reach: Math.round(numBR(obj.reach)),
        impressions: Math.round(numBR(obj.impressions)),
        clicks: Math.round(numBR(obj.clicks)),
        conversations: Math.round(numBR(obj.conversations)),
      });
    });
    setRows(parsed);
    setErros(problemas.slice(0, 6));
    if (!parsed.length) toast.error("Nenhuma linha válida encontrada");
  };

  const importar = async () => {
    if (!unidade) return toast.error("Selecione a unidade");
    if (!rows.length) return toast.error("Escolha um arquivo primeiro");
    setBusy(true);
    const payload = rows.map((r) => ({ ...r, unit_id: unidade }));
    const { error } = await supabase.from("ad_metrics" as any).upsert(payload, {
      onConflict: "unit_id,date,platform,campaign,adset,ad",
    });
    setBusy(false);
    if (error) return toast.error("Falha na importação: " + error.message);
    toast.success(`${payload.length} linhas importadas`);
    setRows([]);
    onOpenChange(false);
    onDone();
  };

  const totalSpend = rows.reduce((a, r) => a + r.spend, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="font-barlow uppercase">Importar métricas de anúncios</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs font-dm text-muted-foreground">
            Exporte o relatório do Gerenciador de Anúncios (Meta) ou do Google Ads em CSV com uma linha por dia e
            envie aqui. Reconhecemos data, campanha, conjunto, anúncio, investimento, alcance, impressões, cliques e conversas.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Unidade</Label>
              <select className="w-full h-9 rounded-md border bg-background px-2 text-sm font-dm"
                value={unidade} onChange={(e) => setUnidade(e.target.value)}>
                {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Plataforma padrão</Label>
              <Select value={plataforma} onValueChange={setPlataforma}>
                <SelectTrigger className="h-9 font-dm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                  <SelectItem value="Google Ads">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Arquivo CSV</Label>
            <input type="file" accept=".csv,text/csv" className="w-full text-sm font-dm"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
          {!!rows.length && (
            <div className="rounded-lg border p-3 text-sm font-dm">
              <p>{rows.length} linhas prontas · investimento total R$ {totalSpend.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Linhas repetidas do mesmo dia/campanha/anúncio são atualizadas, não duplicadas.
              </p>
            </div>
          )}
          {!!erros.length && (
            <ul className="text-xs font-dm text-destructive space-y-0.5">
              {erros.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          <Button className="w-full font-dm" disabled={busy || !rows.length} onClick={importar}>
            <Upload size={14} className="mr-1.5" /> {busy ? "Importando..." : "Importar métricas"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
