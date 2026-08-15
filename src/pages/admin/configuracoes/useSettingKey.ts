import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logSensitive } from "@/lib/audit";

/** Carrega/salva uma chave de app_settings com defaults, loading, erro e auditoria. */
export function useSettingKey<T extends Record<string, any>>(key: string, defaults: T, label: string) {
  const [value, setValue] = useState<T>(defaults);
  const [original, setOriginal] = useState<T>(defaults);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", key).maybeSingle();
    if (error) { setError(error.message); setLoading(false); return; }
    const merged = { ...defaults, ...((data?.value as any) || {}) } as T;
    setValue(merged); setOriginal(merged); setLoading(false);
  }, [key]);

  useEffect(() => { load(); }, [load]);

  const set = (patch: Partial<T>) => setValue(v => ({ ...v, ...patch }));

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({ key, value: value as any }, { onConflict: "key" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    logSensitive({
      entity: "app_settings", entity_id: key, module: "configuracoes",
      description: `Alterou configurações de ${label}`,
      before: original, after: value,
    });
    setOriginal(value);
    toast.success("Configurações salvas");
  };

  return { value, set, save, loading, saving, error, reload: load };
}
