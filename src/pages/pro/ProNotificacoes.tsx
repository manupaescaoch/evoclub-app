import { KIND_LABEL, useStaffNotifications } from "@/hooks/useStaffNotifications";
import { useAccess } from "@/contexts/AccessContext";
import { AlertTriangle, BellOff, CheckCheck, RefreshCw } from "lucide-react";

export default function ProNotificacoes() {
  const { items, loading, error, unread, reload, markRead, markAllRead } = useStaffNotifications();
  const { collaboratorId } = useAccess();

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="font-barlow font-bold text-xl flex-1">NOTIFICAÇÕES</h1>
        {unread > 0 && (
          <button onClick={markAllRead} className="h-10 px-3 rounded-xl bg-card border border-border font-dm text-xs font-semibold flex items-center gap-1.5">
            <CheckCheck size={14} /> Marcar todas
          </button>
        )}
      </div>

      {loading && <p className="py-10 text-center font-dm text-sm text-muted-foreground">Carregando...</p>}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-dm text-sm text-red-700">
          <p className="flex items-center gap-2"><AlertTriangle size={16} /> {error}</p>
          <button onClick={reload} className="mt-3 h-10 w-full rounded-lg bg-white border border-red-200 font-semibold flex items-center justify-center gap-2">
            <RefreshCw size={14} /> Tentar de novo
          </button>
        </div>
      )}

      {!loading && !error && !collaboratorId && (
        <div className="rounded-xl border border-border bg-card p-8 text-center font-dm text-sm text-muted-foreground">
          Seu login não está vinculado a um colaborador. Fale com a coordenação.
        </div>
      )}

      {!loading && !error && collaboratorId && items.length === 0 && (
        <div className="rounded-xl border border-border bg-card p-8 text-center font-dm text-sm text-muted-foreground">
          <BellOff size={22} className="mx-auto mb-2 text-muted-foreground" />
          Nenhuma notificação por aqui.
        </div>
      )}

      {items.map(n => (
        <button key={n.id} onClick={() => markRead(n.id)}
          className={`w-full text-left rounded-2xl border p-4 ${n.read_at ? "border-border bg-card" : "border-primary/30 bg-primary/5"}`}>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-barlow font-bold uppercase tracking-wide text-primary">
              {KIND_LABEL[n.kind] || "Aviso"}
            </span>
            {!n.read_at && <span className="w-2 h-2 rounded-full bg-primary" />}
            <span className="ml-auto font-dm text-[10px] text-muted-foreground">
              {new Date(n.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="font-dm text-sm font-semibold mt-1.5">{n.title}</p>
          {n.body && <p className="font-dm text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</p>}
        </button>
      ))}
    </div>
  );
}
