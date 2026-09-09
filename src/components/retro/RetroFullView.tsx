import { useEffect, useState } from "react";
import {
  Activity, Award, CalendarCheck, Dumbbell, Flame, HeartPulse, Images, MessageSquare,
  Target, Trophy, TrendingDown, TrendingUp, Users,
} from "lucide-react";
import {
  RetroSnapshot, DOW_NAMES, DOW_SHORT, monthLabel, monthShort, nice, num,
  bodyEvolution, openingText, toneText, fmtDate, CARD_KEYS,
} from "@/lib/retro";
import { signPhotos } from "@/hooks/useRetrospectiva";

type Props = {
  snapshot: RetroSnapshot;
  hidden?: string[];
  order?: string[];
  texts?: Record<string, string> | null;
  teamMessage?: string | null;
  teamMessageName?: string | null;
  nextCycle?: Record<string, string> | null;
  hideHealth?: boolean;
  hidePhotos?: boolean;
  onRenew?: () => void;
};

const Card = ({ title, icon: Icon, children }: any) => (
  <section className="rounded-2xl border border-border bg-card p-4">
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="font-barlow text-base font-bold uppercase tracking-wide">{title}</h3>
    </div>
    {children}
  </section>
);

const Stat = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div className="rounded-xl bg-muted/50 p-3">
    <p className="font-barlow text-2xl font-bold leading-none">{value}</p>
    <p className="mt-1 font-dm text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
    {hint && <p className="mt-0.5 font-dm text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

export default function RetroFullView(p: Props) {
  const s = p.snapshot;
  const hidden = new Set(p.hidden || []);
  const txt = p.texts || {};
  const show = (k: string) => !hidden.has(k);
  const f = s.frequency || {};
  const w = s.workouts || {};
  const [photoUrls, setPhotoUrls] = useState<{ url: string; taken_at?: string }[]>([]);

  useEffect(() => {
    const items = (s.photos?.items || []) as any[];
    if (p.hidePhotos || !s.photos?.consent || !items.length) { setPhotoUrls([]); return; }
    signPhotos(items).then(setPhotoUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.photos, p.hidePhotos]);

  const body = bodyEvolution(s);
  const keys = (p.order && p.order.length ? p.order : (CARD_KEYS as readonly string[])).filter(show);
  const has = (k: string) => keys.includes(k);

  return (
    <div className="space-y-4">
      {has("abertura") && (
        <section className="rounded-2xl bg-gradient-to-br from-primary to-indigo-800 p-5 text-white">
          <p className="font-dm text-[11px] uppercase tracking-[0.18em] text-white/70">
            {s.client?.unit_name || "EVO CLUB"} • {fmtDate(s.period?.from)} a {fmtDate(s.period?.to)}
          </p>
          <h2 className="mt-2 font-barlow text-3xl font-bold uppercase leading-tight">
            {s.client?.first_name || "Aluno"}, olha tudo o que você construiu.
          </h2>
          <p className="mt-2 font-dm text-sm text-white/85">{txt.abertura || openingText(s)}</p>
          {s.client?.plan && (
            <p className="mt-3 font-dm text-xs text-white/70">
              Plano {s.client.plan}
              {s.client.contract_end ? ` • vence em ${fmtDate(s.client.contract_end)}` : ""}
            </p>
          )}
        </section>
      )}

      {has("resumo") && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {num(f.total) !== null && <Stat label="Presenças" value={nice(f.total)} />}
          {num(w.total) !== null && <Stat label="Treinos concluídos" value={nice(w.total)} />}
          {num(f.active_weeks) !== null && <Stat label="Semanas ativas" value={nice(f.active_weeks)} />}
          {num(s.client?.months_as_student) !== null && (
            <Stat label="Meses na EVO" value={nice(s.client.months_as_student)} />
          )}
        </div>
      )}

      {has("frequencia") && !!num(f.total) && (
        <Card title="Check-ins e frequência" icon={CalendarCheck}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total de presenças" value={nice(f.total)} />
            <Stat label="Média por semana" value={nice(f.per_week, 1)} />
            <Stat label="Média por mês" value={nice(f.per_month, 1)} />
            <Stat label="% da meta" value={num(f.pct) === null ? "—" : `${nice(f.pct)}%`}
              hint={num(f.planned) ? `meta: ${nice(f.planned)}` : undefined} />
          </div>
          <p className="mt-3 font-dm text-sm text-muted-foreground">
            {txt.frequencia || [
              f.fav_dow !== null && f.fav_dow !== undefined ? `Dia favorito: ${DOW_NAMES[f.fav_dow]}.` : "",
              num(f.fav_hour) !== null ? `Horário mais frequente: ${String(f.fav_hour).padStart(2, "0")}h.` : "",
              f.best_month ? `Mês mais consistente: ${monthLabel(f.best_month)}.` : "",
              toneText(s),
            ].filter(Boolean).join(" ")}
          </p>

          {!!(f.by_month || []).length && (
            <div className="mt-4 flex h-28 items-end gap-2">
              {(f.by_month as any[]).map((m) => {
                const max = Math.max(...(f.by_month as any[]).map((x: any) => x.total), 1);
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="font-barlow text-xs font-bold">{m.total}</span>
                    <div className="w-full rounded-t bg-primary/80" style={{ height: `${(m.total / max) * 72}px` }} />
                    <span className="font-dm text-[10px] uppercase text-muted-foreground">{monthShort(m.month)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {!!(f.by_dow || []).length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(f.by_dow as any[]).map((d) => (
                <span key={d.dow} className="rounded-full bg-primary-soft px-3 py-1 font-dm text-xs text-primary">
                  {DOW_SHORT[d.dow]}: {d.total}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {has("treinos") && !!num(w.total) && (
        <Card title="Treinos realizados" icon={Dumbbell}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Treinos concluídos" value={nice(w.total)} />
            {num(w.minutes) !== null && <Stat label="Minutos de treino" value={nice(w.minutes)} />}
            {num(w.avg_rpe) !== null && <Stat label="Esforço médio" value={nice(w.avg_rpe, 1)} />}
            {num(w.plan_changes) !== null && <Stat label="Ajustes de programa" value={nice(w.plan_changes)} />}
          </div>
          {w.top_session && (
            <p className="mt-3 font-dm text-sm text-muted-foreground">
              {txt.treinos || `Treino mais realizado: ${w.top_session}.`}
            </p>
          )}
          {!!(w.top_exercises || []).length && (
            <ul className="mt-3 space-y-1">
              {(w.top_exercises as any[]).slice(0, 5).map((e) => (
                <li key={e.name} className="flex justify-between font-dm text-sm">
                  <span>{e.name}</span>
                  <span className="text-muted-foreground">{e.sessions}x</span>
                </li>
              ))}
            </ul>
          )}
          {!!(w.load_records || []).length && (
            <div className="mt-3 space-y-1">
              {(w.load_records as any[]).slice(0, 5).map((r) => (
                <p key={r.name} className="font-dm text-sm">
                  <span className="font-semibold">{r.name}</span>: {nice(r.first, 1)} kg → {nice(r.best, 1)} kg
                  <span className="ml-1 text-emerald-600">(+{nice(r.delta, 1)} kg)</span>
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      {has("constancia") && !!num(f.best_week_streak) && (
        <Card title="Constância" icon={Flame}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Maior sequência" value={`${nice(f.best_week_streak)} sem`} />
            <Stat label="Semanas ativas" value={nice(f.active_weeks)} />
            {num(f.months_goal_hit) !== null && <Stat label="Meses na meta" value={nice(f.months_goal_hit)} />}
            {num(f.comebacks) !== null && <Stat label="Retomadas" value={nice(f.comebacks)} />}
          </div>
          {!!(s.badges || []).length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(s.badges || []).map((b) => (
                <span key={b.code} title={b.description || ""}
                  className="rounded-full bg-primary px-3 py-1 font-barlow text-xs font-bold uppercase text-primary-foreground">
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {has("ranking") && s.ranking && !s.ranking.opt_out && num(s.ranking.position) !== null && (
        <Card title="Ranking" icon={Trophy}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Posição na unidade" value={`${nice(s.ranking.position)}º`} hint={`de ${nice(s.ranking.total)}`} />
            {num(s.ranking.top_pct) !== null && <Stat label="Entre os melhores" value={`${nice(s.ranking.top_pct)}%`} />}
            {num(s.ranking.points) !== null && <Stat label="Score" value={nice(s.ranking.points)} />}
          </div>
        </Card>
      )}

      {has("corpo") && !!body.length && (
        <Card title="Evolução corporal" icon={Activity}>
          <div className="space-y-2">
            {body.map((b) => (
              <div key={b.key} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2">
                <span className="font-dm text-sm">{b.label}</span>
                <span className="flex items-center gap-2 font-dm text-sm">
                  <span className="text-muted-foreground">{nice(b.first, 1)} → {nice(b.last, 1)} {b.unit}</span>
                  <span className={`flex items-center gap-1 font-semibold ${
                    b.favorable === true ? "text-emerald-600" : b.favorable === false ? "text-amber-600" : "text-muted-foreground"}`}>
                    {b.delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
                    {b.delta > 0 ? "+" : ""}{nice(b.delta, 1)}
                  </span>
                </span>
              </div>
            ))}
          </div>
          {txt.corpo && <p className="mt-3 font-dm text-sm text-muted-foreground">{txt.corpo}</p>}
        </Card>
      )}

      {has("fotos") && !p.hidePhotos && !!photoUrls.length && (
        <Card title="Fotos de evolução" icon={Images}>
          <div className="grid grid-cols-2 gap-2">
            {photoUrls.slice(0, 4).map((ph, i) => (
              <figure key={i} className="overflow-hidden rounded-xl">
                <img src={ph.url} alt={`Foto de evolução ${i + 1}`} loading="lazy" className="h-48 w-full object-cover" />
                <figcaption className="p-1 font-dm text-[11px] text-muted-foreground">{fmtDate(ph.taken_at)}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-2 font-dm text-[11px] text-muted-foreground">
            Fotos exibidas com autorização do aluno.
          </p>
        </Card>
      )}

      {has("saude") && !p.hideHealth && s.health && (num(s.health.checkins) || num(s.health.weight_first)) && (
        <Card title="Saúde e bem-estar" icon={HeartPulse}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {num(s.health.checkins) !== null && <Stat label="Check-ins diários" value={nice(s.health.checkins)} />}
            {num(s.health.avg?.sleep_hours) !== null && <Stat label="Sono médio" value={`${nice(s.health.avg.sleep_hours, 1)}h`} />}
            {num(s.health.avg?.energy) !== null && <Stat label="Disposição média" value={nice(s.health.avg.energy, 1)} />}
            {num(s.health.avg?.stress) !== null && <Stat label="Estresse médio" value={nice(s.health.avg.stress, 1)} />}
          </div>
          <div className="mt-3 space-y-1 font-dm text-sm text-muted-foreground">
            {num(s.health.weight_first) !== null && num(s.health.weight_last) !== null && (
              <p>Peso registrado: {nice(s.health.weight_first, 1)} kg → {nice(s.health.weight_last, 1)} kg.</p>
            )}
            {s.health.bp_last && (
              <p>Última pressão registrada: {s.health.bp_last.systolic}/{s.health.bp_last.diastolic} mmHg.</p>
            )}
            {!!num(s.health.adaptations) && (
              <p>Seu treino recebeu {nice(s.health.adaptations)} adaptações para manter segurança e continuidade.</p>
            )}
            {txt.saude && <p>{txt.saude}</p>}
          </div>
        </Card>
      )}

      {has("avaliacoes") && !!num(s.assessments?.total) && (
        <Card title="Acompanhamento profissional" icon={Target}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Avaliações realizadas" value={nice(s.assessments.total)} />
            {s.assessments.last_at && <Stat label="Última avaliação" value={fmtDate(s.assessments.last_at)} />}
            {num(s.assessments.avg_rating) !== null && <Stat label="Nota média do aluno" value={nice(s.assessments.avg_rating, 1)} />}
          </div>
          {!!(s.assessments.professionals || []).length && (
            <p className="mt-3 font-dm text-sm text-muted-foreground">
              Acompanhado por {(s.assessments.professionals as string[]).join(", ")}.
            </p>
          )}
        </Card>
      )}

      {has("comunidade") && s.community && (num(s.community.posts) || num(s.community.indications)) && (
        <Card title="Comunidade" icon={Users}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {num(s.community.posts) !== null && <Stat label="Publicações" value={nice(s.community.posts)} />}
            {num(s.community.indications) !== null && <Stat label="Indicações" value={nice(s.community.indications)} />}
            {num(s.community.indications_converted) !== null && (
              <Stat label="Amigos matriculados" value={nice(s.community.indications_converted)} />
            )}
            {num(s.community.nps) !== null && <Stat label="Nota NPS" value={nice(s.community.nps, 1)} />}
          </div>
        </Card>
      )}

      {has("destaques") && !!(s.timeline || []).length && (
        <Card title="Momentos de destaque" icon={Award}>
          <ol className="space-y-2">
            {(s.timeline || []).map((t, i) => (
              <li key={`${t.at}-${i}`} className="flex gap-3">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="font-dm text-sm font-semibold">{t.title}</p>
                  <p className="font-dm text-xs text-muted-foreground">
                    {fmtDate(t.at)}{t.detail ? ` • ${t.detail}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {has("mensagem") && p.teamMessage && (
        <Card title="Mensagem da equipe" icon={MessageSquare}>
          <p className="font-dm text-sm">{p.teamMessage}</p>
          {p.teamMessageName && <p className="mt-2 font-dm text-xs text-muted-foreground">— {p.teamMessageName}</p>}
        </Card>
      )}

      {has("proximo") && p.nextCycle && Object.values(p.nextCycle).some(Boolean) && (
        <Card title="Próximo ciclo" icon={Target}>
          <ul className="space-y-1 font-dm text-sm">
            {p.nextCycle.objective && <li><b>Objetivo:</b> {p.nextCycle.objective}</li>}
            {p.nextCycle.frequency && <li><b>Frequência sugerida:</b> {p.nextCycle.frequency}</li>}
            {p.nextCycle.priority && <li><b>Prioridade:</b> {p.nextCycle.priority}</li>}
            {p.nextCycle.recommendation && <li><b>Recomendação:</b> {p.nextCycle.recommendation}</li>}
          </ul>
        </Card>
      )}

      {has("renovacao") && p.onRenew && (
        <section className="rounded-2xl bg-gradient-to-br from-indigo-900 to-primary p-5 text-white">
          <h3 className="font-barlow text-2xl font-bold uppercase leading-tight">
            Você construiu muito até aqui. Vamos para o próximo nível?
          </h3>
          <button onClick={p.onRenew}
            className="mt-4 w-full rounded-xl bg-white py-3 font-barlow text-base font-bold uppercase text-primary">
            Quero renovar
          </button>
        </section>
      )}
    </div>
  );
}
