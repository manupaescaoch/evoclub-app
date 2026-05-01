export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = (phone || "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${clean}?text=${text}`;
}

export function openWhatsApp(phone: string, message: string) {
  const url = buildWhatsAppLink(phone, message);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function taskMessage(p: { name: string; title: string; due?: string; priority?: string; unit?: string; description?: string }) {
  return [
    `Olá, ${p.name || ""}. Você tem uma tarefa atribuída:`,
    "",
    p.title,
    p.due ? `Prazo: ${p.due}` : "",
    p.priority ? `Prioridade: ${p.priority}` : "",
    p.unit ? `Unidade: ${p.unit}` : "",
    "",
    "Descrição:",
    p.description || "—",
    "",
    "Por favor, atualize o status assim que possível.",
  ].filter(Boolean).join("\n");
}

export function routineMessage(p: { name: string; title: string; date?: string; time?: string; unit?: string; description?: string; checklist?: string }) {
  return [
    `Olá, ${p.name || ""}. Você tem uma rotina operacional atribuída:`,
    "",
    p.title,
    p.date ? `Data: ${p.date}` : "",
    p.time ? `Horário: ${p.time}` : "",
    p.unit ? `Unidade: ${p.unit}` : "",
    "",
    "Descrição:",
    p.description || "—",
    p.checklist ? `\nChecklist/Formulário: ${p.checklist}` : "",
    "",
    "Por favor, registre a execução no sistema.",
  ].filter(Boolean).join("\n");
}
