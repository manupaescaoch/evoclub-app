import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "coach" | "coordinator" | "student" | "viewer";

export function useUserRole() {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (mounted) { setRoles([]); setLoading(false); } return; }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      if (mounted) {
        setRoles(((data || []) as { role: AppRole }[]).map(r => r.role));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const canManage = roles.some(r => r === "admin" || r === "coach" || r === "coordinator");
  return { roles, canManage, loading };
}