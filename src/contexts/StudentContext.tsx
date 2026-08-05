import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type StudentClient = {
  id: number;
  name: string;
  email: string | null;
  unit_id: string | null;
  plan: string | null;
  onboarding_completed: boolean;
};

type Ctx = {
  session: Session | null;
  client: StudentClient | null;
  loading: boolean;
  reload: () => Promise<void>;
  saveName: (name: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOut: () => Promise<void>;
};

const StudentContext = createContext<Ctx | null>(null);

const fetchClient = async (userId: string): Promise<StudentClient | null> => {
  const { data } = await supabase
    .from("clients")
    .select("id, name, email, unit_id, plan, onboarding_completed")
    .eq("auth_user_id", userId)
    .maybeSingle();
  return (data as StudentClient) ?? null;
};

export const StudentProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<StudentClient | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    setClient(data.session ? await fetchClient(data.session.user.id) : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) {
        setClient(null);
        setLoading(false);
      } else {
        fetchClient(s.user.id).then((c) => {
          setClient(c);
          setLoading(false);
        });
      }
    });
    reload();
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  const saveName = useCallback(
    async (name: string) => {
      const t = name.trim();
      if (!t || !client) return;
      setClient({ ...client, name: t });
      await supabase.from("clients").update({ name: t }).eq("id", client.id);
    },
    [client]
  );

  const completeOnboarding = useCallback(async () => {
    if (!client) return;
    setClient({ ...client, onboarding_completed: true });
    await supabase.from("clients").update({ onboarding_completed: true }).eq("id", client.id);
  }, [client]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setClient(null);
  }, []);

  return (
    <StudentContext.Provider
      value={{ session, client, loading, reload, saveName, completeOnboarding, signOut }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent deve ser usado dentro de StudentProvider");
  return ctx;
};