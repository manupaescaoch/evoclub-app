import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudent } from "@/contexts/StudentContext";

export type ProfileRow = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  birth_date: string | null;
  gender: string | null;
  plan: string | null;
  plan_value: number | null;
  status: string | null;
  unit_id: string | null;
  contract_start: string | null;
  contract_end: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

const FIELDS =
  "id, name, email, phone, cpf, birth_date, gender, plan, plan_value, status, unit_id, contract_start, contract_end, avatar_url, created_at";

/** Cadastro completo do aluno logado + foto de perfil (bucket privado). */
export const useProfile = () => {
  const { session, client, reload } = useStudent();
  const clientId = client?.id ?? null;
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const signAvatar = useCallback(async (path: string | null) => {
    if (!path) return setAvatar(null);
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
    setAvatar(data?.signedUrl ?? null);
  }, []);

  const load = useCallback(async () => {
    if (!clientId) { setLoading(false); return; }
    const { data } = await supabase.from("clients").select(FIELDS).eq("id", clientId).maybeSingle();
    const row = (data as ProfileRow) ?? null;
    setProfile(row);
    await signAvatar(row?.avatar_url ?? null);
    setLoading(false);
  }, [clientId, signAvatar]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(
    async (patch: Partial<ProfileRow>) => {
      if (!clientId) return { error: "Cadastro não encontrado" };
      const { error } = await supabase.from("clients").update(patch).eq("id", clientId);
      if (error) return { error: error.message };
      setProfile((p) => (p ? { ...p, ...patch } : p));
      await reload();
      return {};
    },
    [clientId, reload]
  );

  const uploadAvatar = useCallback(
    async (file: File) => {
      const uid = session?.user.id;
      if (!uid || !clientId) return { error: "Sessão inválida" };
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) return { error: upErr.message };
      const { error } = await supabase.from("clients").update({ avatar_url: path }).eq("id", clientId);
      if (error) return { error: error.message };
      setProfile((p) => (p ? { ...p, avatar_url: path } : p));
      await signAvatar(path);
      return {};
    },
    [session, clientId, signAvatar]
  );

  return { profile, avatar, loading, save, uploadAvatar, reload: load };
};

export const daysLeft = (end: string | null) => {
  if (!end) return null;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  today.setHours(0, 0, 0, 0);
  const e = new Date(`${end}T00:00:00`);
  return Math.round((e.getTime() - today.getTime()) / 86400000);
};
