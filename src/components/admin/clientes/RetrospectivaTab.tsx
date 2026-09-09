import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  BarChart3, Check, Copy, Eye, Link2, Loader2, MessageCircle, RefreshCw, Send, Sparkles, Trash2,
} from "lucide-react";
import { OverviewRow } from "@/hooks/useClient360";
import { useAccess } from "@/contexts/AccessContext";
import { useRetrospectiva } from "@/hooks/useRetrospectiva";
import {
  CARD_KEYS, CARD_LABEL, PERIOD_LABEL, RetroPeriodKind, Retrospective,
  STATUS_LABEL, STATUS_STYLE, fmtDate, nice,
} from "@/lib/retro";
import RetroFullView from "@/components/retro/RetroFullView";
import RetroStories from "@/components/retro/RetroStories";

const PERIODS: RetroPeriodKind[] = ["entrada", "contrato", "12m", "ano", "custom"];

export default function RetrospectivaTab({ c }: { c: OverviewRow }) {
  const { can } = useAccess();
  const podeEditar = can("clientes", "edit");
  const podeSensivel = can("clientes", "sensitive");
  const r = useRetrospectiva(c.id);

  const [kind, setKind] = useState<RetroPeriodKind>("contrato");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<"completa" | "stories">("completa");

  const active: Retrospective | null = useMemo(
    () => r.rows.find((x) => x.id === activeId) || r.rows[0] || null,
    [r.rows, activeId]
  );

  const [hidden, setHidden] = useState<string[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [teamMessage, setTeamMessage] = useState("");
  const [nextCycle, setNextCycle] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!active) return;
    setHidden(active.hidden_cards || []);
    setTexts(active.custom_texts || {});
    setTeamMessage(active.team_message || "");
    setNextCycle(active.next_cycle || {});
  }, [active?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = !!active && ["enviada", "visualizada", "renovacao_iniciada", "renovado", "nao_renovado"].includes(active.status);
  const links = active ? r.linksFor(active.id) : [];
  const liveLink = links.find((l) => !l.revoked_at);

  const gerar = async () => {
    try {
      if (kind === "custom" && (!from || !to)) return toast.error("Informe o período");
      const id = await r.generate(kind, kind === "custom" ? from : undefined, kind === "custom" ? to : undefined);
      if (id) setActiveId(id);
      toast.success("Retrospectiva gerada com dados reais");
    } catch (e: any) { toast.error(e.message || "Não foi possível gerar"); }
  };

  const salvar = async () => {
    if (!active) return;
    try {
      await r.saveReview(active.id, { hidden, texts, teamMessage: teamMessage || null, nextCycle });
      toast.success("Revisão salva");
    } catch (e: any) { toast.error(e.message); }
  };

  const aprovar = async () => {
    if (!active) return;
    try { await r.approve(active.id); toast.success("Retrospectiva aprovada"); }
    catch (e: any) { toast.error(e.message); }
  };

  const gerarLink = async (social: boolean) => {
    if (!active) return;
    try {
      const token = await r.createLink(active.id, {
        days: 30, allowPhotos: !!r.consent?.allow_photos, allowHealth: !social && podeSensivel, social,
      });
      if (token) {
        await navigator.clipboard.writeText(`${window.location.origin}/retro/${token}`).catch(() => {});
        toast.success("Link criado e copiado");
      }
    } catch (e: any) { toast.error(e.message); }
  };

  const enviarWhatsapp = async () => {
    if (!active || !liveLink) return toast.error("Gere o link antes de enviar");
    const url = `${window.location.origin}/retro/${liveLink.token}`;
    const phone = (c as any).phone?.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Oi ${String(c.name).split(" ")[0]}! Preparamos a sua Retrospectiva EVO com tudo o que você construiu na academia. Dá uma olhada: ${url}`
    );
    window.open(`https://wa.me/${phone ? `55${phone}` : ""}?text=${msg}`, "_blank");
    await r.markSent(active.id, "whatsapp");
  };

  if (r.loading) {
    return <div className="flex items-center gap-2 p-6 font-dm text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> Carregando retrospectivas...
    </div>;
  }

  return (
    <div className="space-y-5 p-1">
      {/* Geração */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-barlow text-base font-bold uppercase tracking-wide">Gerar retrospectiva</h3>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="font-dm text-[11px] uppercase text-muted-foreground">Período</span>
            <select value={kind} onChange={(e) => setKind(e.target.value as RetroPeriodKind)}
              className="h-10 rounded-lg border border-input bg-background px-3 font-dm text-sm">
              {PERIODS.map((p) => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}
            </select>
          </label>
          {kind === "custom" && (
            <>
              <label className="flex flex-col gap-1">
                <span className="font-dm text-[11px] uppercase text-muted-foreground">De</span>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 font-dm text-sm" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-dm text-[11px] uppercase text-muted-foreground">Até</span>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="h-10 rounded-lg border border-input bg-background px-3 font-dm text-sm" />
              </label>
            </>
          )}
          <button onClick={gerar} disabled={!podeEditar || r.busy}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 font-barlow text-sm font-bold uppercase text-primary-foreground disabled:opacity-50">
            {r.busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Gerar
          </button>
        </div>
        {!podeEditar && (
          <p className="mt-2 font-dm text-xs text-muted-foreground">
            Você pode visualizar as retrospectivas, mas não gerar ou enviar.
          </p>
        )}
      </section>

      {!r.rows.length && (
        <p className="rounded-2xl border border-dashed border-border p-6 text-center font-dm text-sm text-muted-foreground">
          Nenhuma retrospectiva gerada para este aluno ainda.
        </p>
      )}

      {!!r.rows.length && (
        <section className="flex flex-wrap gap-2">
          {r.rows.map((row) => (
            <button key={row.id} onClick={() => setActiveId(row.id)}
              className={`rounded-xl border px-3 py-2 text-left font-dm text-xs ${
                active?.id === row.id ? "border-primary bg-primary-soft" : "border-border bg-card"}`}>
              <span className="block font-semibold">{PERIOD_LABEL[row.period_kind]} • v{row.version}</span>
              <span className="text-muted-foreground">{fmtDate(row.period_from)} a {fmtDate(row.period_to)}</span>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${STATUS_STYLE[row.status] || "bg-muted"}`}>
                {STATUS_LABEL[row.status] || row.status}
              </span>
            </button>
          ))}
        </section>
      )}

      {active && active.snapshot && (
        <>
          {/* Ações e status */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 font-dm text-xs ${STATUS_STYLE[active.status] || "bg-muted"}`}>
                {STATUS_LABEL[active.status] || active.status}
              </span>
              {active.sent_at && <span className="font-dm text-xs text-muted-foreground">Enviada em {fmtDate(active.sent_at)}</span>}
              {active.first_viewed_at && <span className="font-dm text-xs text-emerald-700">Vista em {fmtDate(active.first_viewed_at)}</span>}
              <span className="flex items-center gap-1 font-dm text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5" /> {nice(active.views)} visualizações
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={aprovar} disabled={!podeEditar || r.busy || locked}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-dm text-sm disabled:opacity-50">
                <Check className="h-4 w-4" /> Aprovar
              </button>
              <button onClick={() => gerarLink(false)} disabled={!podeEditar || r.busy}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-dm text-sm disabled:opacity-50">
                <Link2 className="h-4 w-4" /> Link do aluno
              </button>
              <button onClick={() => gerarLink(true)} disabled={!podeEditar || r.busy}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-dm text-sm disabled:opacity-50">
                <Copy className="h-4 w-4" /> Link para compartilhar
              </button>
              <button onClick={enviarWhatsapp} disabled={!podeEditar || r.busy}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-dm text-sm text-white disabled:opacity-50">
                <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
              </button>
              <button onClick={() => active && r.markSent(active.id, "app")} disabled={!podeEditar || r.busy}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-dm text-sm disabled:opacity-50">
                <Send className="h-4 w-4" /> Marcar como enviada
              </button>
            </div>
            {!!links.length && (
              <ul className="mt-3 space-y-1">
                {links.map((l) => (
                  <li key={l.id} className="flex flex-wrap items-center gap-2 font-dm text-xs">
                    <code className="rounded bg-muted px-2 py-0.5">/retro/{l.token.slice(0, 10)}…</code>
                    <span className="text-muted-foreground">
                      {l.social_mode ? "compartilhável" : "aluno"} • {l.views} aberturas
                      {l.expires_at ? ` • expira ${fmtDate(l.expires_at)}` : ""}
                      {l.revoked_at ? " • revogado" : ""}
                    </span>
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/retro/${l.token}`)}
                      className="text-primary">copiar</button>
                    {!l.revoked_at && podeEditar && (
                      <button onClick={() => r.revokeLink(l.id)} className="flex items-center gap-1 text-red-600">
                        <Trash2 className="h-3 w-3" /> revogar
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Revisão interna */}
          {podeEditar && (
            <section className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="font-barlow text-base font-bold uppercase tracking-wide">Revisão antes do envio</h3>
              </div>
              {locked && (
                <p className="mb-3 rounded-lg bg-amber-50 p-2 font-dm text-xs text-amber-800">
                  Esta retrospectiva já foi enviada. Para alterar, gere uma nova versão.
                </p>
              )}
              <p className="font-dm text-[11px] uppercase tracking-wide text-muted-foreground">Cards exibidos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CARD_KEYS.map((k) => {
                  const off = hidden.includes(k);
                  return (
                    <button key={k} disabled={locked}
                      onClick={() => setHidden(off ? hidden.filter((h) => h !== k) : [...hidden, k])}
                      className={`rounded-full px-3 py-1 font-dm text-xs ${off ? "bg-muted text-muted-foreground line-through" : "bg-primary-soft text-primary"}`}>
                      {CARD_LABEL[k]}
                    </button>
                  );
                })}
              </div>

              <label className="mt-4 block">
                <span className="font-dm text-[11px] uppercase text-muted-foreground">Mensagem da equipe</span>
                <textarea value={teamMessage} onChange={(e) => setTeamMessage(e.target.value)} rows={3} disabled={locked}
                  placeholder="Uma mensagem curta do treinador ou coordenador"
                  className="mt-1 w-full rounded-lg border border-input bg-background p-2 font-dm text-sm" />
              </label>

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {[["objective", "Objetivo do próximo ciclo"], ["frequency", "Frequência sugerida"],
                  ["priority", "Prioridade"], ["recommendation", "Recomendação"]].map(([k, label]) => (
                  <label key={k} className="block">
                    <span className="font-dm text-[11px] uppercase text-muted-foreground">{label}</span>
                    <input value={nextCycle[k] || ""} disabled={locked}
                      onChange={(e) => setNextCycle({ ...nextCycle, [k]: e.target.value })}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-dm text-sm" />
                  </label>
                ))}
              </div>

              <label className="mt-3 block">
                <span className="font-dm text-[11px] uppercase text-muted-foreground">Texto da abertura (opcional)</span>
                <input value={texts.abertura || ""} disabled={locked}
                  onChange={(e) => setTexts({ ...texts, abertura: e.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 font-dm text-sm" />
              </label>

              <button onClick={salvar} disabled={r.busy || locked}
                className="mt-4 rounded-lg bg-primary px-4 py-2 font-barlow text-sm font-bold uppercase text-primary-foreground disabled:opacity-50">
                Salvar revisão
              </button>
            </section>
          )}

          {/* Pré-visualização */}
          <section>
            <div className="mb-3 flex gap-2">
              {(["completa", "stories"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`rounded-lg px-3 py-1.5 font-dm text-sm ${mode === m ? "bg-primary text-primary-foreground" : "border border-border"}`}>
                  {m === "completa" ? "Visão completa" : "Modo stories"}
                </button>
              ))}
            </div>
            {mode === "completa" ? (
              <RetroFullView snapshot={active.snapshot} hidden={hidden} texts={texts}
                teamMessage={teamMessage || null} teamMessageName={active.reviewed_by_name}
                nextCycle={nextCycle} hidePhotos={!r.consent?.allow_photos} hideHealth={!podeSensivel} />
            ) : (
              <RetroStories snapshot={active.snapshot} hidden={hidden} texts={texts}
                teamMessage={teamMessage || null} teamMessageName={active.reviewed_by_name}
                nextCycle={nextCycle} hidePhotos={!r.consent?.allow_photos} hideHealth={!podeSensivel} />
            )}
          </section>
        </>
      )}
    </div>
  );
}
