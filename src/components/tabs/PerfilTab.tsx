import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStudent } from "@/contexts/StudentContext";
import { useStudentStats } from "@/hooks/useStudentStats";
import { useProfile, daysLeft } from "@/hooks/useProfile";
import PushNotificationsCard from "@/components/tabs/PushNotificationsCard";
import {
  Camera, ChevronRight, ChevronLeft, Calendar, HeartPulse, CreditCard,
  Shield, LogOut, Trophy, Flame, Gift, Dumbbell, Zap, Edit2, Loader2,
  History, HelpCircle, Bell, Ticket, ClipboardList, Camera as CameraIcon, Users,
} from "lucide-react";

interface PerfilTabProps {
  onBack: () => void;
  onNavigate?: (screen: string) => void;
}

const monthLabel = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });

const PerfilTab = ({ onBack, onNavigate }: PerfilTabProps) => {
  const { signOut } = useStudent();
  const navigate = useNavigate();
  const stats = useStudentStats();
  const { profile, avatar, save, uploadAvatar } = useProfile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", birth_date: "" });
  const [monthDays, setMonthDays] = useState<number[]>([]);

  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfWeek = new Date(today.getFullYear(), today.getMonth(), 1).getDay();

  useEffect(() => {
    if (!profile) return;
    setForm({
      name: profile.name || "",
      phone: profile.phone || "",
      birth_date: profile.birth_date || "",
    });
    const from = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
    supabase
      .from("workout_logs")
      .select("workout_date")
      .eq("client_id", profile.id)
      .eq("status", "completed")
      .gte("workout_date", from)
      .then(({ data }) =>
        setMonthDays(
          Array.from(
            new Set(((data || []) as { workout_date: string }[]).map((l) => Number(l.workout_date.slice(8, 10))))
          )
        )
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const initials = useMemo(
    () =>
      (profile?.name || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join(""),
    [profile?.name]
  );

  const memberSince = profile?.contract_start || profile?.created_at;
  const left = daysLeft(profile?.contract_end ?? null);

  const pickAvatar = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    const { error } = await uploadAvatar(file);
    setUploading(false);
    if (error) return toast.error("Não foi possível enviar a foto");
    toast.success("Foto atualizada!");
  };

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Informe seu nome");
    const { error } = await save({
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      birth_date: form.birth_date || null,
    });
    if (error) return toast.error("Não foi possível salvar");
    toast.success("Dados atualizados!");
    setEditing(false);
  };

  const cards = [
    { label: "Treinos", value: String(stats.totalWorkouts), icon: Dumbbell },
    { label: "Sequência", value: String(stats.streak), icon: Flame },
    { label: "XP total", value: String(stats.xpTotal), icon: Zap },
    { label: "Média/sem", value: stats.weeklyAverage != null ? String(stats.weeklyAverage) : "—", icon: Trophy },
  ];

  const menu = [
    { label: "Meu plano e contrato", icon: CreditCard, screen: "plano", hint: left != null ? `${left} dia(s)` : undefined },
    { label: "Saúde & Evolução", icon: HeartPulse, screen: "saude" },
    { label: "Avaliações físicas", icon: ClipboardList, screen: "avaliacoes" },
    { label: "Fotos de evolução", icon: CameraIcon, screen: "fotos" },
    { label: "Meu histórico", icon: History, screen: "historico" },
    { label: "Notificações", icon: Bell, screen: "notificacoes" },
    { label: "Club de vantagens", icon: Ticket, screen: "club" },
    { label: "Indique e ganhe", icon: Gift, screen: "indicacoes" },
    { label: "Comunidade", icon: Users, screen: "comunidade" },
    { label: "Privacidade", icon: Shield, screen: "privacidade" },
    { label: "Ajuda", icon: HelpCircle, screen: "ajuda" },
  ];

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center">
          <ChevronLeft size={22} className="text-foreground" />
        </button>
        <p className="font-barlow font-bold text-lg text-foreground">Meu Perfil</p>
      </div>

      {/* Avatar + Nome */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-3">
          <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            {avatar ? (
              <img src={avatar} alt={`Foto de ${profile?.name || "aluno"}`} className="w-full h-full object-cover" />
            ) : (
              <span className="text-primary-foreground text-2xl font-bold font-dm">{initials || "?"}</span>
            )}
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center shadow-md"
            aria-label="Trocar foto de perfil"
          >
            {uploading ? <Loader2 size={14} className="text-primary animate-spin" /> : <Camera size={14} className="text-primary" />}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pickAvatar(e.target.files?.[0])}
          />
        </div>
        <button className="flex items-center gap-2" onClick={() => setEditing(true)}>
          <p className="font-barlow font-bold text-xl text-foreground">{profile?.name || "—"}</p>
          <Edit2 size={14} className="text-muted" />
        </button>
        <p className="text-xs text-muted font-dm">
          {memberSince ? `Membro desde ${monthLabel(new Date(`${memberSince.slice(0, 10)}T00:00:00`))}` : "Aluno EVO"}
        </p>
      </div>

      {/* Edição de dados */}
      {editing && (
        <div className="rounded-2xl bg-white p-4 card-shadow mb-4 space-y-2">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">MEUS DADOS</p>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nome completo"
            className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="WhatsApp"
            inputMode="tel"
            className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none"
          />
          <div>
            <label className="text-[10px] font-dm text-muted">Nascimento</label>
            <input
              type="date"
              value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              className="w-full rounded-xl border border-border px-3 py-3 text-sm font-dm outline-none"
            />
          </div>
          <p className="text-[10px] font-dm text-muted">E-mail: {profile?.email || "—"}</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-3 rounded-2xl bg-secondary text-muted font-dm font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={submit}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Stats reais */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {cards.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-3 card-shadow text-center">
            <s.icon size={16} className="text-primary mx-auto mb-1" />
            <p className="font-barlow font-[800] text-base text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted font-dm leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Plano resumido */}
      <button
        onClick={() => onNavigate?.("plano")}
        className="w-full text-left rounded-2xl bg-white p-4 card-shadow mb-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">MEU PLANO</p>
            <p className="font-barlow font-[800] text-lg text-foreground mt-0.5">{profile?.plan || "Sem plano"}</p>
            <p className="text-[11px] font-dm text-muted">
              {left == null
                ? "Fale com a recepção para ativar"
                : left < 0
                ? `Vencido há ${Math.abs(left)} dia(s)`
                : `Faltam ${left} dia(s) para renovar`}
            </p>
          </div>
          <ChevronRight size={16} className="text-muted" />
        </div>
      </button>

      {/* Consistência real do mês */}
      <div className="rounded-2xl bg-white p-4 card-shadow mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-primary" />
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-muted font-bold">CONSISTÊNCIA DO MÊS</p>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <span key={i} className="text-[9px] text-muted font-dm font-semibold">{d}</span>
          ))}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isActive = monthDays.includes(day);
            const isToday = day === today.getDate();
            return (
              <div
                key={day}
                className={`w-full aspect-square rounded-full flex items-center justify-center text-[10px] font-dm ${
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isToday
                    ? "border border-primary text-primary font-semibold"
                    : "text-muted"
                }`}
              >
                {day}
              </div>
            );
          })}
        </div>
        <p className="text-[10px] font-dm text-muted text-center mt-1">
          {monthDays.length} treino(s) registrado(s) neste mês
        </p>
      </div>

      <PushNotificationsCard />

      <div className="space-y-2 mb-4">
        {menu.map((item) => (
          <button
            key={item.label}
            onClick={() => onNavigate?.(item.screen)}
            className="w-full flex items-center justify-between rounded-2xl bg-white p-4 card-shadow"
          >
            <div className="flex items-center gap-3">
              <item.icon size={18} className="text-muted" />
              <span className="text-sm font-dm text-foreground">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              {item.hint && <span className="text-[10px] font-dm text-muted">{item.hint}</span>}
              <ChevronRight size={16} className="text-muted" />
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={async () => { await signOut(); navigate("/aluno/login", { replace: true }); }}
        className="w-full py-3 rounded-2xl border border-red-200 text-red-500 font-dm font-semibold text-sm flex items-center justify-center gap-2 mb-4"
      >
        <LogOut size={16} />
        Sair da Conta
      </button>
    </div>
  );
};

export default PerfilTab;
