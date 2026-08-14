import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Building2 } from "lucide-react";
import { useUnit, Unit } from "@/contexts/UnitContext";
import { EmptyState, LoadingState } from "@/components/admin/gerencial/PageShell";
import { logSensitive } from "@/lib/audit";

const DAYS = [
  { key: "mon", label: "Seg" }, { key: "tue", label: "Ter" }, { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" }, { key: "fri", label: "Sex" }, { key: "sat", label: "Sáb" },
  { key: "sun", label: "Dom" },
];

type Hours = Record<string, { open: string; close: string }>;

const defaultHours = (): Hours =>
  DAYS.reduce((acc, d) => {
    acc[d.key] = ["sat", "sun"].includes(d.key) ? { open: "08:00", close: "14:00" } : { open: "05:00", close: "23:00" };
    return acc;
  }, {} as Hours);

export default function UnidadesTab() {
  const { units, reloadUnits } = useUnit();
  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState<Unit | null>(null);
  const [original, setOriginal] = useState<Unit | null>(null);
  const [hours, setHours] = useState<Hours>(defaultHours());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (units.length && !selected) setSelected(units[0].id);
    setLoading(false);
  }, [units, selected]);

  useEffect(() => {
    const u = units.find(x => x.id === selected) || null;
    setForm(u ? { ...u } : null);
    setOriginal(u ? { ...u } : null);
    const h = (u?.opening_hours || {}) as Hours;
    setHours(Object.keys(h).length ? { ...defaultHours(), ...h } : defaultHours());
  }, [selected, units]);

  const set = (patch: Partial<Unit>) => setForm(f => (f ? { ...f, ...patch } : f));

  const save = async () => {
    if (!form) return;
    setSaving(true);
    const payload = {
      name: form.name,
      address: form.address ?? null,
      default_capacity: Number(form.default_capacity ?? 14),
      timeclock_radius_m: Number(form.timeclock_radius_m ?? 150),
      latitude: form.latitude === null || form.latitude === undefined || (form.latitude as any) === "" ? null : Number(form.latitude),
      longitude: form.longitude === null || form.longitude === undefined || (form.longitude as any) === "" ? null : Number(form.longitude),
      legal_name: form.legal_name ?? null,
      cnpj: form.cnpj ?? null,
      state_registration: form.state_registration ?? null,
      municipal_registration: form.municipal_registration ?? null,
      phone: form.phone ?? null,
      email: form.email ?? null,
      fiscal_address: form.fiscal_address ?? null,
      status: form.status ?? "active",
      opening_hours: hours,
    };
    const { error } = await supabase.from("units").update(payload as any).eq("id", form.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    logSensitive({
      entity: "unit", entity_id: form.id, module: "configuracoes", unit_id: form.id,
      description: `Alterou configurações da unidade ${form.name}`,
      before: original as any, after: { ...payload, id: form.id } as any,
    });
    toast.success("Unidade atualizada");
    reloadUnits();
  };

  if (loading) return <LoadingState />;
  if (!units.length) return <EmptyState message="Nenhuma unidade disponível no seu escopo de acesso." />;

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1.5"><Label className="text-xs font-dm text-muted-foreground">{label}</Label>{node}</div>
  );

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-primary" />
          <p className="font-barlow font-bold text-base">Unidade</p>
        </div>
        <select value={selected} onChange={e => setSelected(e.target.value)}
          className="w-full md:w-72 h-10 rounded-md border border-input bg-background px-3 text-sm font-dm">
          {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        {form && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {field("Nome", <Input value={form.name || ""} onChange={e => set({ name: e.target.value })} />)}
              {field("Capacidade padrão por horário", <Input type="number" min={1} value={form.default_capacity ?? 14} onChange={e => set({ default_capacity: Number(e.target.value) })} />)}
              {field("Raio permitido do ponto (metros)", <Input type="number" min={10} value={form.timeclock_radius_m ?? 150} onChange={e => set({ timeclock_radius_m: Number(e.target.value) })} />)}
              {field("Endereço", <Input value={form.address || ""} onChange={e => set({ address: e.target.value })} />)}
              {field("Latitude", <Input value={form.latitude ?? ""} onChange={e => set({ latitude: e.target.value as any })} placeholder="-23.5505" />)}
              {field("Longitude", <Input value={form.longitude ?? ""} onChange={e => set({ longitude: e.target.value as any })} placeholder="-46.6333" />)}
            </div>

            <div className="border-t border-border pt-4">
              <p className="font-barlow font-bold text-sm mb-3">Horários de funcionamento</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {DAYS.map(d => (
                  <div key={d.key} className="rounded-lg border border-border p-3 space-y-2">
                    <p className="text-xs font-dm font-semibold">{d.label}</p>
                    <div className="flex items-center gap-2">
                      <Input type="time" value={hours[d.key]?.open || ""} className="h-8"
                        onChange={e => setHours({ ...hours, [d.key]: { ...(hours[d.key] || { open: "", close: "" }), open: e.target.value } })} />
                      <span className="text-xs text-muted-foreground">às</span>
                      <Input type="time" value={hours[d.key]?.close || ""} className="h-8"
                        onChange={e => setHours({ ...hours, [d.key]: { ...(hours[d.key] || { open: "", close: "" }), close: e.target.value } })} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="font-barlow font-bold text-sm mb-3">Dados fiscais</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {field("Razão social", <Input value={form.legal_name || ""} onChange={e => set({ legal_name: e.target.value })} />)}
                {field("CNPJ", <Input value={form.cnpj || ""} onChange={e => set({ cnpj: e.target.value })} />)}
                {field("Inscrição estadual", <Input value={form.state_registration || ""} onChange={e => set({ state_registration: e.target.value })} />)}
                {field("Inscrição municipal", <Input value={form.municipal_registration || ""} onChange={e => set({ municipal_registration: e.target.value })} />)}
                {field("Telefone", <Input value={form.phone || ""} onChange={e => set({ phone: e.target.value })} />)}
                {field("E-mail", <Input value={form.email || ""} onChange={e => set({ email: e.target.value })} />)}
              </div>
              <div className="mt-4">
                {field("Endereço fiscal", <Input value={form.fiscal_address || ""} onChange={e => set({ fiscal_address: e.target.value })} />)}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button disabled={saving} onClick={save} className="gap-1.5"><Save size={14} /> Salvar unidade</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
