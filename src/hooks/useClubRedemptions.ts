import { useCallback, useEffect, useState } from "react";

export type Redemption = {
  id: string;
  partnerId: string;
  partnerName: string;
  amount: number;
  date: string; // ISO
};

const KEY = "club_redemptions";

const read = (): Redemption[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Redemption[]) : [];
  } catch {
    return [];
  }
};

/** Histórico de resgates do Club (armazenado no dispositivo). */
export const useClubRedemptions = () => {
  const [items, setItems] = useState<Redemption[]>([]);

  useEffect(() => setItems(read()), []);

  const add = useCallback((r: Omit<Redemption, "id" | "date">) => {
    const next = [
      { ...r, id: crypto.randomUUID(), date: new Date().toISOString() },
      ...read(),
    ];
    localStorage.setItem(KEY, JSON.stringify(next));
    setItems(next);
  }, []);

  const total = items.reduce((s, r) => s + (r.amount || 0), 0);

  return { items, add, total };
};

/** ID de membro estável a partir do nome/dispositivo. */
export const useMemberId = (seed: string) => {
  const [id, setId] = useState("EVO-000124");
  useEffect(() => {
    let stored = localStorage.getItem("club_member_id");
    if (!stored) {
      let h = 0;
      const base = seed || "evo";
      for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) % 999999;
      stored = `EVO-${String(h || 124).padStart(6, "0")}`;
      localStorage.setItem("club_member_id", stored);
    }
    setId(stored);
  }, [seed]);
  return id;
};