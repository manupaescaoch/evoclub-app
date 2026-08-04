import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Nome padrão do perfil do aluno (usado quando não há login com metadata). */
export const DEFAULT_STUDENT_NAME = "Rafael Costa";

/** Nome do aluno vindo do perfil (metadata do login) com fallback no dispositivo. */
export const useStudentName = () => {
  const [name, setName] = useState<string>(
    typeof window !== "undefined"
      ? localStorage.getItem("student_name") || DEFAULT_STUDENT_NAME
      : DEFAULT_STUDENT_NAME
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      const u = data.user;
      if (u) {
        const meta = (u.user_metadata || {}) as Record<string, string>;
        const resolved =
          meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "");
        if (resolved) {
          setName(resolved);
          localStorage.setItem("student_name", resolved);
        }
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const saveName = (v: string) => {
    const t = v.trim();
    if (!t) return;
    setName(t);
    localStorage.setItem("student_name", t);
  };

  return { name, saveName, loading };
};

/** Saudação conforme horário de Brasília. */
export const brGreeting = () => {
  const hour = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  ).getHours();
  if (hour < 12) return { text: "Bom dia", emoji: "☀️" };
  if (hour < 18) return { text: "Boa tarde", emoji: "🌤️" };
  return { text: "Boa noite", emoji: "🌙" };
};