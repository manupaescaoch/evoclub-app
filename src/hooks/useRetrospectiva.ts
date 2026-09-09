import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Retrospective, RetroPeriodKind, RetroSnapshot } from "@/lib/retro";

const rpc = async <T,>(fn: string, args: Record<string, any> = {}): Promise<T> => {
  const { data, error } = await (supabase as any).rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};

export type ShareLink = {
  id: string; token: string; expires_at: string | null; revoked_at: string | null;
  allow_photos: boolean; allow_health: boolean; social_mode: boolean;
  views: number; created_at: string;
};

export function useRetrospectiva(clientId?: number) {
  const [rows, setRows] = useState<Retrospective[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [consent, setConsent] = useState<{ allow_photos: boolean; allow_share: boolean; allow_ranking: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    setLoading(true); setError(null);
    const [r, c] = await Promise.all([
      (supabase as any).from("retrospectives").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      (supabase as any).from("retro_consents").select("allow_photos, allow_share, allow_ranking").eq("client_id", clientId).maybeSingle(),
    ]);
    if (r.error) setError(r.error.message);
    const list = (r.data || []) as Retrospective[];
    setRows(list);
    setConsent(c.data ?? null);
    if (list.length) {
      const l = await (supabase as any).from("retro_share_links").select("*")
        .in("retrospective_id", list.map((x) => x.id)).order("created_at", { ascending: false });
      setLinks((l.data || []) as ShareLink[]);
    } else setLinks([]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const withBusy = async <T,>(fn: () => Promise<T>) => {
    setBusy(true);
    try { return await fn(); } finally { setBusy(false); }
  };

  const preview = (kind: RetroPeriodKind, from?: string, to?: string) =>
    rpc<any>("retro_period", { _client_id: clientId, _kind: kind, _from: from ?? null, _to: to ?? null });

  const generate = (kind: RetroPeriodKind, from?: string, to?: string, trigger = "manual") =>
    withBusy(async () => {
      const res = await rpc<any>("retro_generate", {
        _client_id: clientId, _kind: kind, _from: from ?? null, _to: to ?? null, _trigger: trigger,
      });
      if (res?.ok === false) throw new Error(res.error || "Não foi possível gerar");
      const id = res?.id || res?.retrospective?.id || res;
      if (typeof id === "string") { try { await rpc("retro_body_fill", { _retro_id: id }); } catch { /* opcional */ } }
      await load();
      return typeof id === "string" ? id : null;
    });

  const saveReview = (id: string, patch: {
    hidden?: string[]; order?: string[]; highlights?: any; texts?: any;
    teamMessage?: string | null; teamKind?: string | null; teamUrl?: string | null; nextCycle?: any;
  }) => withBusy(async () => {
    const res = await rpc<any>("retro_review_save", {
      _id: id,
      _hidden: patch.hidden ?? null,
      _order: patch.order ?? null,
      _highlights: patch.highlights ?? null,
      _texts: patch.texts ?? null,
      _team_message: patch.teamMessage ?? null,
      _team_kind: patch.teamKind ?? null,
      _team_url: patch.teamUrl ?? null,
      _next_cycle: patch.nextCycle ?? null,
    });
    if (res?.ok === false) throw new Error(res.error || "Não foi possível salvar");
    await load();
  });

  const approve = (id: string) => withBusy(async () => {
    const res = await rpc<any>("retro_approve", { _id: id });
    if (res?.ok === false) throw new Error(res.error || "Não foi possível aprovar");
    await load();
  });

  const createLink = (id: string, opts: { days: number; allowPhotos: boolean; allowHealth: boolean; social: boolean }) =>
    withBusy(async () => {
      const res = await rpc<any>("retro_share_create", {
        _id: id, _days: opts.days, _allow_photos: opts.allowPhotos,
        _allow_health: opts.allowHealth, _social: opts.social,
      });
      if (res?.ok === false) throw new Error(res.error || "Não foi possível criar o link");
      await load();
      return (res?.token || res?.link?.token || null) as string | null;
    });

  const revokeLink = (linkId: string) => withBusy(async () => {
    await rpc("retro_share_revoke", { _link_id: linkId });
    await load();
  });

  const markSent = (id: string, channel: string) => withBusy(async () => {
    await rpc("retro_mark_sent", { _id: id, _channel: channel });
    await load();
  });

  const linksFor = (retroId: string) => links.filter((l) => (l as any).retrospective_id === retroId);

  return {
    rows, links, linksFor, consent, loading, busy, error,
    reload: load, preview, generate, saveReview, approve, createLink, revokeLink, markSent,
  };
}

/** Snapshot ao vivo (pré-visualização antes de gerar). */
export function useRetroPreview(clientId?: number, from?: string, to?: string) {
  const [snap, setSnap] = useState<RetroSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!clientId || !from || !to) return;
    setLoading(true);
    rpc<RetroSnapshot>("retro_compute", { _client_id: clientId, _from: from, _to: to })
      .then(setSnap).catch(() => setSnap(null)).finally(() => setLoading(false));
  }, [clientId, from, to]);
  return { snap, loading };
}

/** Retrospectiva do aluno logado (app). */
export function useMyRetro() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    setLoading(true);
    rpc<any>("retro_my").then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  return { data, loading, reload: load };
}

/** Fotos de evolução assinadas (somente com consentimento). */
export async function signPhotos(items: { storage_path: string; taken_at?: string }[]) {
  const out: { url: string; taken_at?: string }[] = [];
  for (const it of items) {
    const { data } = await supabase.storage.from("evolution").createSignedUrl(it.storage_path, 3600);
    if (data?.signedUrl) out.push({ url: data.signedUrl, taken_at: it.taken_at });
  }
  return out;
}
