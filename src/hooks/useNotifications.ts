import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStudentName } from "@/hooks/useStudentName";

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  kind: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
};

export const useNotifications = () => {
  const { clientId } = useStudentName();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!clientId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("id, title, body, kind, url, read_at, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data || []) as Notification[]);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((n) => !n.read_at).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  };

  const markAllRead = async () => {
    if (!clientId) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from("notifications").update({ read_at: now }).eq("client_id", clientId).is("read_at", null);
  };

  const remove = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  return { items, loading, unread, reload: load, markRead, markAllRead, remove };
};
