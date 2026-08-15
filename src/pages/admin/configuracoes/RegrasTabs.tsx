import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save, CalendarClock, Dumbbell, ClipboardList, Users } from "lucide-react";
import { LoadingState } from "@/components/admin/gerencial/PageShell";
import { useSettingKey } from "./useSettingKey";

function Card({ icon: Icon, title, hint, children }: { icon: any; title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-primary" />
        <div>
          <p className="font-barlow font-bold text-base">{title}</p>
          {hint && <p className="text-xs text-muted-foreground font-dm">{hint}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function Num({ label, hint, value, onChange, min = 0 }: { label: string; hint?: string; value: any; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-dm text-muted-foreground">{label}</Label>
      <Input type="number" min={min} value={value ?? 0} onChange={e => onChange(Number(e.target.value))} />
      {hint && <p className="text-[11px] text-muted-foreground font-dm">{hint}</p>}
    </div>
  );
}

function Shell({ children, save, saving, loading, error }: any) {
  if (loading) return <LoadingState />;
  if (error) return <div className="bg-card rounded-xl card-shadow p-5 text-sm font-dm text-red-600">Erro ao carregar configurações: {error}</div>;
  return (
    <div className="space-y-4">
      {children}
      <div className="flex justify-end">
        <Button disabled={saving} onClick={save} className="gap-1.5"><Save size={14} /> Salvar</Button>
      </div>
    </div>
  );
}

/* ---------------- GRADE ---------------- */
export function GradeConfigTab() {
  const s = useSettingKey("grade", {
    booking_window_hours: 12, distribution_open_minutes: 20, cancel_min_minutes: 20,
    waitlist_auto_promote: true, waitlist_max: 10, waitlist_notify: true,
  }, "Grade");
  const { value: v, set } = s;
  return (
    <Shell {...s}>
      <Card icon={CalendarClock} title="Agendamento" hint="Horários padrão e capacidade por unidade ficam na aba Unidades.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Num label="Janela de agendamento (horas antes)" hint="Aluno só agenda dentro desta antecedência." value={v.booking_window_hours} onChange={n => set({ booking_window_hours: n })} min={1} />
          <Num label="Abertura da distribuição (minutos antes)" hint="Também é o limite para o aluno agendar." value={v.distribution_open_minutes} onChange={n => set({ distribution_open_minutes: n })} min={0} />
          <Num label="Cancelamento sem penalidade (minutos antes)" value={v.cancel_min_minutes} onChange={n => set({ cancel_min_minutes: n })} min={0} />
        </div>
      </Card>
      <Card icon={Users} title="Lista de espera">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <Num label="Limite de alunos na fila por horário" value={v.waitlist_max} onChange={n => set({ waitlist_max: n })} min={0} />
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div><p className="text-sm font-dm font-semibold">Promover automático</p><p className="text-[11px] text-muted-foreground font-dm">Ao cancelar, o primeiro da fila entra.</p></div>
            <Switch checked={!!v.waitlist_auto_promote} onCheckedChange={b => set({ waitlist_auto_promote: b })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div><p className="text-sm font-dm font-semibold">Notificar aluno</p><p className="text-[11px] text-muted-foreground font-dm">Avisa quando a vaga abrir.</p></div>
            <Switch checked={!!v.waitlist_notify} onCheckedChange={b => set({ waitlist_notify: b })} />
          </div>
        </div>
      </Card>
    </Shell>
  );
}

/* ---------------- TREINOS ---------------- */
export function TreinosConfigTab() {
  const s = useSettingKey("treinos", { default_validity_days: 60, warn_days_before: 7, expired_after_days: 0 }, "Treinos");
  const { value: v, set } = s;
  return (
    <Shell {...s}>
      <Card icon={Dumbbell} title="Prazos e alertas da ficha">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Num label="Validade padrão da ficha (dias)" hint="Sugerido ao prescrever um novo treino." value={v.default_validity_days} onChange={n => set({ default_validity_days: n })} min={1} />
          <Num label="Avisar quantos dias antes do vencimento" value={v.warn_days_before} onChange={n => set({ warn_days_before: n })} min={0} />
          <Num label="Considerar vencido após (dias de carência)" hint="0 = vence no dia seguinte à data de validade." value={v.expired_after_days} onChange={n => set({ expired_after_days: n })} min={0} />
        </div>
      </Card>
    </Shell>
  );
}

/* ---------------- AVALIAÇÕES ---------------- */
export function AvaliacoesConfigTab() {
  const s = useSettingKey("avaliacoes", { periodicity_days: 90, slot_capacity: 1, warn_days_before: 7 }, "Avaliações");
  const { value: v, set } = s;
  return (
    <Shell {...s}>
      <Card icon={ClipboardList} title="Periodicidade e agenda">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Num label="Reavaliar a cada (dias)" value={v.periodicity_days} onChange={n => set({ periodicity_days: n })} min={7} />
          <Num label="Avaliações simultâneas por profissional/horário" value={v.slot_capacity} onChange={n => set({ slot_capacity: n })} min={1} />
          <Num label="Avisar quantos dias antes do prazo" value={v.warn_days_before} onChange={n => set({ warn_days_before: n })} min={0} />
        </div>
      </Card>
    </Shell>
  );
}

/* ---------------- CRM ---------------- */
export function CrmConfigTab() {
  const s = useSettingKey("crm", { followup_stale_days: 3, no_contact_hours: 24, negotiation_stale_days: 5, quick_filters: "" }, "CRM");
  const { value: v, set } = s;
  return (
    <Shell {...s}>
      <Card icon={Users} title="Réguas de follow up" hint="Usado nas filas do dashboard comercial e na fila de ação.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Num label="Lead sem resposta vira follow-up atrasado após (dias)" value={v.followup_stale_days} onChange={n => set({ followup_stale_days: n })} min={1} />
          <Num label="Lead novo sem contato após (horas)" value={v.no_contact_hours} onChange={n => set({ no_contact_hours: n })} min={1} />
          <Num label="Negociação parada após (dias)" value={v.negotiation_stale_days} onChange={n => set({ negotiation_stale_days: n })} min={1} />
        </div>
      </Card>
      <Card icon={ClipboardList} title="Filtros rápidos salvos" hint="Um por linha, no formato Nome | status (ex: Negociação | negociacao).">
        <textarea value={v.quick_filters || ""} onChange={e => set({ quick_filters: e.target.value })}
          rows={5} className="w-full rounded-md border border-input bg-background p-3 text-sm font-dm"
          placeholder={"Sem contato | novo\nNegociação | negociacao"} />
      </Card>
    </Shell>
  );
}
