import { Bell, BellOff, Share, Plus, Smartphone, AlertTriangle } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const PushNotificationsCard = () => {
  const { state, busy, error, needsInstallOnIOS, isIOS, enable, disable } = usePushNotifications();

  return (
    <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            {state === "on" ? <Bell size={16} className="text-primary" /> : <BellOff size={16} className="text-muted" />}
          </div>
          <div>
            <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">NOTIFICAÇÕES</p>
            <p className="text-xs text-muted font-dm mt-0.5">
              {state === "on"
                ? "Ativas neste aparelho"
                : state === "denied"
                ? "Bloqueadas no navegador"
                : state === "unsupported"
                ? "Não disponíveis neste navegador"
                : "Receba lembrete da sua aula e avisos da equipe"}
            </p>
          </div>
        </div>
      </div>

      {isIOS && needsInstallOnIOS && state !== "on" && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <p className="text-[11px] font-dm font-semibold text-amber-700">iPhone: instale o app primeiro</p>
          </div>
          <p className="text-[10px] font-dm text-amber-700 mt-1 leading-relaxed">
            No Safari, as notificações só funcionam depois de adicionar o app à tela de início:
            toque em <Share size={10} className="inline -mt-0.5" /> Compartilhar e depois em{" "}
            <Plus size={10} className="inline -mt-0.5" /> "Adicionar à Tela de Início".
          </p>
        </div>
      )}

      {state === "denied" && (
        <p className="mt-3 text-[10px] font-dm text-muted leading-relaxed">
          Libere as notificações nas configurações do navegador para este site e volte aqui.
        </p>
      )}

      {error && <p className="mt-3 text-[10px] font-dm text-red-500">{error}</p>}

      {state !== "unsupported" && state !== "denied" && (
        <button
          disabled={busy || state === "loading"}
          onClick={() => (state === "on" ? disable() : enable())}
          className={`w-full mt-3 py-3 rounded-2xl font-dm font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 ${
            state === "on" ? "border border-border text-muted" : "bg-primary text-white cta-shadow"
          }`}
        >
          {state === "on" ? <BellOff size={15} /> : <Bell size={15} />}
          {busy ? "Aguarde..." : state === "on" ? "Desativar notificações" : "Ativar notificações"}
        </button>
      )}

      {state === "unsupported" && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary p-3">
          <Smartphone size={14} className="text-muted" />
          <p className="text-[10px] font-dm text-muted">
            Abra o app no Chrome (Android/desktop) ou instale na tela de início no iPhone.
          </p>
        </div>
      )}
    </div>
  );
};

export default PushNotificationsCard;
