import { ChevronLeft, Bell, Trash2, CheckCheck, Dumbbell, CalendarDays, Heart, Ticket, Users } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const iconFor = (kind: string) => {
  if (kind.includes("treino")) return Dumbbell;
  if (kind.includes("aula") || kind.includes("agenda")) return CalendarDays;
  if (kind.includes("saude") || kind.includes("avaliacao")) return Heart;
  if (kind.includes("club")) return Ticket;
  if (kind.includes("comunidade")) return Users;
  return Bell;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

interface Props {
  onBack: () => void;
  onNavigate?: (tab: string) => void;
}

const NotificacoesTab = ({ onBack, onNavigate }: Props) => {
  const { items, loading, unread, markRead, markAllRead, remove } = useNotifications();

  const open = (id: string, url: string | null, read: boolean) => {
    if (!read) markRead(id);
    if (!url) return;
    if (url.startsWith("tab:")) onNavigate?.(url.slice(4));
    else window.open(url, "_blank");
  };

  return (
    <div>
      <div className="sticky top-0 bg-white z-10 px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="w-8 h-8 -ml-1 flex items-center justify-center">
            <ChevronLeft size={22} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-barlow font-bold text-xl text-foreground">NOTIFICAÇÕES</h1>
            <p className="text-xs text-muted font-dm">
              {unread > 0 ? `${unread} não lida${unread > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-[11px] font-dm font-semibold text-primary flex items-center gap-1"
            >
              <CheckCheck size={14} /> Marcar todas
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-2">
        {loading &&
          [0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl bg-white card-shadow p-4 animate-pulse">
              <div className="h-3 w-1/2 bg-secondary rounded mb-2" />
              <div className="h-3 w-3/4 bg-secondary rounded" />
            </div>
          ))}

        {!loading && items.length === 0 && (
          <div className="rounded-2xl bg-white card-shadow p-8 text-center">
            <Bell size={28} className="text-muted mx-auto mb-2" />
            <p className="font-barlow font-bold text-base text-foreground">Nenhuma notificação</p>
            <p className="text-xs text-muted font-dm mt-1">
              Avisos de treino, aulas e evolução aparecem aqui.
            </p>
          </div>
        )}

        {items.map((n) => {
          const Icon = iconFor(n.kind || "");
          const read = !!n.read_at;
          return (
            <div
              key={n.id}
              className={`rounded-2xl card-shadow p-3 flex gap-3 ${read ? "bg-white" : "bg-primary/5 border-l-4 border-l-primary"}`}
            >
              <button
                onClick={() => open(n.id, n.url, read)}
                className="flex gap-3 flex-1 text-left min-w-0"
              >
                <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </span>
                <div className="min-w-0">
                  <p className={`font-dm text-sm text-foreground ${read ? "" : "font-semibold"}`}>{n.title}</p>
                  {n.body && <p className="text-xs text-muted font-dm mt-0.5">{n.body}</p>}
                  <p className="text-[10px] text-muted font-dm mt-1">{formatDate(n.created_at)}</p>
                </div>
              </button>
              <button
                onClick={() => remove(n.id)}
                aria-label="Excluir notificação"
                className="w-8 h-8 flex items-center justify-center shrink-0"
              >
                <Trash2 size={15} className="text-muted" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificacoesTab;
