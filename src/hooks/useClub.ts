import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Partner = {
  id: string;
  name: string;
  category: string;
  tag: string | null;
  discount_label: string | null;
  location: string | null;
  image_url: string | null;
  description: string | null;
  redeem_instructions: string | null;
  code: string | null;
};

export type Redemption = {
  id: string;
  partner_id: string | null;
  amount_saved: number | null;
  status: string;
  redeemed_at: string;
  confirmed_at: string | null;
  partners?: { name: string } | null;
};

export const memberCodeFromId = (id: string) =>
  `EVO-${id.replace(/[^a-fA-F0-9]/g, "").slice(-6).toUpperCase()}`;

/** Parceiros ativos do Club. */
export const usePartners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("partners")
      .select("*")
      .eq("active", true)
      .order("name")
      .then(({ data }) => {
        setPartners((data ?? []) as Partner[]);
        setLoading(false);
      });
  }, []);

  return { partners, loading };
};

/** Cartão de membro do aluno autenticado (persistido no banco). */
export const useClubMember = (name: string, unit: string) => {
  const [studentId, setStudentId] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState<string>("");

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id;
      if (!alive || !uid) return;
      setStudentId(uid);
      const code = memberCodeFromId(uid);
      setMemberCode(code);
      await supabase
        .from("club_members")
        .upsert(
          { student_id: uid, member_code: code, name, unit },
          { onConflict: "student_id" }
        );
    });
    return () => { alive = false; };
  }, [name, unit]);

  return { studentId, memberCode };
};

/** Resgates do aluno autenticado. Somente confirmados contam na economia. */
export const useClubRedemptions = (studentId: string | null) => {
  const [items, setItems] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!studentId) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("club_redemptions")
      .select("id, partner_id, amount_saved, status, redeemed_at, confirmed_at, partners(name)")
      .eq("student_id", studentId)
      .order("redeemed_at", { ascending: false });
    setItems((data ?? []) as unknown as Redemption[]);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { load(); }, [load]);

  /** Solicita resgate: fica pendente até a recepção/parceiro validar. */
  const request = useCallback(
    async (partnerId: string) => {
      if (!studentId) return { error: "no-session" as const };
      const { error } = await supabase
        .from("club_redemptions")
        .insert({ student_id: studentId, partner_id: partnerId, status: "pending" });
      if (!error) await load();
      return { error: error?.message ?? null };
    },
    [studentId, load]
  );

  const total = items
    .filter((r) => r.status === "confirmed")
    .reduce((s, r) => s + Number(r.amount_saved || 0), 0);

  const pendingCount = items.filter((r) => r.status === "pending").length;

  return { items, total, pendingCount, request, reload: load, loading };
};
