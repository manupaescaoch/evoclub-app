import { useStudent } from "@/contexts/StudentContext";

/** Nome e id do aluno logado (cadastro real na unidade). */
export const useStudentName = () => {
  const { client, loading, saveName } = useStudent();
  return {
    name: client?.name ?? "",
    clientId: client?.id ?? null,
    unitId: client?.unit_id ?? null,
    saveName,
    loading,
  };
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