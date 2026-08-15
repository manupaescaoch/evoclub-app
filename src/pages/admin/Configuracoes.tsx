import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Building2, Sliders, Plug, User, KeyRound, LogOut, Save, ScrollText, MapPin, Layers, CalendarClock, Dumbbell, ClipboardList, Users, Bell } from "lucide-react";
import AuditLogTab from "@/components/admin/AuditLogTab";
import UnidadesTab from "@/pages/admin/configuracoes/UnidadesTab";
import PlanosTab from "@/pages/admin/configuracoes/PlanosTab";
import NotificacoesTab from "@/pages/admin/configuracoes/NotificacoesTab";
import IntegracoesStatus from "@/pages/admin/configuracoes/IntegracoesStatus";
import { GradeConfigTab, TreinosConfigTab, AvaliacoesConfigTab, CrmConfigTab } from "@/pages/admin/configuracoes/RegrasTabs";

type TabKey = "empresa" | "unidades" | "planos" | "grade" | "treinos" | "avaliacoes" | "crm" | "notificacoes" | "sistema" | "integracoes" | "conta" | "auditoria";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "empresa", label: "Dados da empresa", icon: Building2 },
  { key: "unidades", label: "Unidades", icon: MapPin },
  { key: "planos", label: "Planos", icon: Layers },
  { key: "grade", label: "Grade", icon: CalendarClock },
  { key: "treinos", label: "Treinos", icon: Dumbbell },
  { key: "avaliacoes", label: "Avaliações", icon: ClipboardList },
  { key: "crm", label: "CRM", icon: Users },
  { key: "notificacoes", label: "Notificações", icon: Bell },
  { key: "sistema", label: "Preferências do sistema", icon: Sliders },
  { key: "integracoes", label: "Integrações", icon: Plug },
  { key: "conta", label: "Conta e segurança", icon: User },
  { key: "auditoria", label: "Auditoria", icon: ScrollText },
];

type CompanyData = {
  legal_name: string; trade_name: string; cnpj: string;
  email: string; phone: string; whatsapp: string;
  address: string; city: string; state: string; zip: string;
  logo_url: string; site: string; instagram: string;
};

type SystemPrefs = {
  timezone: string; currency: string; locale: string;
  date_format: string; week_start: "sunday" | "monday";
  theme_lock: boolean;
};

type Integrations = {
  whatsapp_number: string; whatsapp_enabled: boolean;
  smtp_host: string; smtp_port: string; smtp_user: string; smtp_from: string; email_enabled: boolean;
  payment_provider: string; payment_key: string; payment_enabled: boolean;
  turnstile_provider: string; turnstile_endpoint: string; turnstile_enabled: boolean;
};

const DEFAULT_COMPANY: CompanyData = {
  legal_name: "", trade_name: "EVO Club", cnpj: "",
  email: "", phone: "", whatsapp: "",
  address: "", city: "", state: "", zip: "",
  logo_url: "", site: "", instagram: "",
};
const DEFAULT_SYSTEM: SystemPrefs = {
  timezone: "America/Sao_Paulo", currency: "BRL", locale: "pt-BR",
  date_format: "dd/MM/yyyy", week_start: "monday", theme_lock: true,
};
const DEFAULT_INTEGRATIONS: Integrations = {
  whatsapp_number: "", whatsapp_enabled: true,
  smtp_host: "", smtp_port: "587", smtp_user: "", smtp_from: "", email_enabled: false,
  payment_provider: "", payment_key: "", payment_enabled: false,
  turnstile_provider: "Relsystem", turnstile_endpoint: "", turnstile_enabled: false,
};

const Configuracoes = () => {
  const [tab, setTab] = useState<TabKey>("empresa");
  const [company, setCompany] = useState<CompanyData>(DEFAULT_COMPANY);
  const [system, setSystem] = useState<SystemPrefs>(DEFAULT_SYSTEM);
  const [integrations, setIntegrations] = useState<Integrations>(DEFAULT_INTEGRATIONS);
  const [user, setUser] = useState<{ email: string; full_name: string }>({ email: "", full_name: "" });
  const [pw, setPw] = useState({ next: "", confirm: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("app_settings").select("key,value").in("key", ["company", "system", "integrations"]);
    for (const row of data || []) {
      if (row.key === "company") setCompany({ ...DEFAULT_COMPANY, ...(row.value as any) });
      if (row.key === "system") setSystem({ ...DEFAULT_SYSTEM, ...(row.value as any) });
      if (row.key === "integrations") setIntegrations({ ...DEFAULT_INTEGRATIONS, ...(row.value as any) });
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setUser({
        email: session.user.email || "",
        full_name: (session.user.user_metadata as any)?.full_name || (session.user.user_metadata as any)?.name || "",
      });
    }
  };
  useEffect(() => { load(); }, []);

  const saveKey = async (key: string, value: any) => {
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert({ key, value }, { onConflict: "key" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Salvo");
  };

  const updateProfile = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: user.full_name } });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Perfil atualizado");
  };

  const changePassword = async () => {
    if (!pw.next || pw.next.length < 8) return toast.error("Senha precisa de pelo menos 8 caracteres");
    if (pw.next !== pw.confirm) return toast.error("Confirmação não confere");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success("Senha alterada"); setPw({ next: "", confirm: "" }); }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/admin/login";
  };

  const field = (label: string, node: React.ReactNode) => (
    <div className="space-y-1.5"><Label className="text-xs font-dm text-muted-foreground">{label}</Label>{node}</div>
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-barlow font-bold text-2xl md:text-3xl text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground font-dm mt-1">Ajustes gerais da empresa, sistema, integrações e conta.</p>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-xl p-1.5 card-shadow flex gap-1 overflow-x-auto">
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-dm inline-flex items-center gap-2 whitespace-nowrap transition-colors
                ${active ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "empresa" && (
        <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Razão social", <Input value={company.legal_name} onChange={e => setCompany({ ...company, legal_name: e.target.value })} />)}
            {field("Nome fantasia", <Input value={company.trade_name} onChange={e => setCompany({ ...company, trade_name: e.target.value })} />)}
            {field("CNPJ", <Input value={company.cnpj} onChange={e => setCompany({ ...company, cnpj: e.target.value })} />)}
            {field("Site", <Input value={company.site} onChange={e => setCompany({ ...company, site: e.target.value })} />)}
            {field("E-mail", <Input type="email" value={company.email} onChange={e => setCompany({ ...company, email: e.target.value })} />)}
            {field("Telefone", <Input value={company.phone} onChange={e => setCompany({ ...company, phone: e.target.value })} />)}
            {field("WhatsApp", <Input value={company.whatsapp} onChange={e => setCompany({ ...company, whatsapp: e.target.value })} />)}
            {field("Instagram", <Input value={company.instagram} onChange={e => setCompany({ ...company, instagram: e.target.value })} />)}
            {field("URL do logo", <Input value={company.logo_url} onChange={e => setCompany({ ...company, logo_url: e.target.value })} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Endereço", <Input value={company.address} onChange={e => setCompany({ ...company, address: e.target.value })} />)}
            {field("CEP", <Input value={company.zip} onChange={e => setCompany({ ...company, zip: e.target.value })} />)}
            {field("Cidade", <Input value={company.city} onChange={e => setCompany({ ...company, city: e.target.value })} />)}
            {field("Estado", <Input value={company.state} onChange={e => setCompany({ ...company, state: e.target.value })} />)}
          </div>
          <div className="flex justify-end pt-2">
            <Button disabled={saving} onClick={() => saveKey("company", company)} className="gap-1.5"><Save size={14} /> Salvar</Button>
          </div>
        </div>
      )}

      {tab === "sistema" && (
        <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {field("Fuso horário", (
              <select value={system.timezone} onChange={e => setSystem({ ...system, timezone: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="America/Sao_Paulo">America/Sao_Paulo (BRT)</option>
                <option value="America/Manaus">America/Manaus</option>
                <option value="America/Recife">America/Recife</option>
                <option value="UTC">UTC</option>
              </select>
            ))}
            {field("Moeda", (
              <select value={system.currency} onChange={e => setSystem({ ...system, currency: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="BRL">Real (BRL)</option>
                <option value="USD">Dólar (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            ))}
            {field("Idioma", (
              <select value={system.locale} onChange={e => setSystem({ ...system, locale: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="pt-BR">Português (Brasil)</option>
                <option value="en-US">English (US)</option>
                <option value="es-ES">Español</option>
              </select>
            ))}
            {field("Formato de data", (
              <select value={system.date_format} onChange={e => setSystem({ ...system, date_format: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="dd/MM/yyyy">31/12/2026</option>
                <option value="MM/dd/yyyy">12/31/2026</option>
                <option value="yyyy-MM-dd">2026-12-31</option>
              </select>
            ))}
            {field("Início da semana", (
              <select value={system.week_start} onChange={e => setSystem({ ...system, week_start: e.target.value as any })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="monday">Segunda</option>
                <option value="sunday">Domingo</option>
              </select>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <p className="text-sm font-dm font-semibold">Tema fixo (claro)</p>
              <p className="text-xs text-muted-foreground font-dm">Bloqueia alternância de tema para manter o visual da marca.</p>
            </div>
            <Switch checked={system.theme_lock} onCheckedChange={v => setSystem({ ...system, theme_lock: v })} />
          </div>
          <div className="flex justify-end pt-2">
            <Button disabled={saving} onClick={() => saveKey("system", system)} className="gap-1.5"><Save size={14} /> Salvar</Button>
          </div>
        </div>
      )}

      {tab === "integracoes" && (
        <div className="space-y-4">
          <IntegracoesStatus />
          <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-barlow font-bold text-base">WhatsApp</p><p className="text-xs text-muted-foreground font-dm">Envio via wa.me a partir do número principal.</p></div>
              <Switch checked={integrations.whatsapp_enabled} onCheckedChange={v => setIntegrations({ ...integrations, whatsapp_enabled: v })} />
            </div>
            {field("Número (com DDI, apenas dígitos)", <Input value={integrations.whatsapp_number} onChange={e => setIntegrations({ ...integrations, whatsapp_number: e.target.value })} placeholder="5511999999999" />)}
          </div>

          <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-barlow font-bold text-base">E-mail (SMTP)</p><p className="text-xs text-muted-foreground font-dm">Servidor para envio de notificações e recibos.</p></div>
              <Switch checked={integrations.email_enabled} onCheckedChange={v => setIntegrations({ ...integrations, email_enabled: v })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Host", <Input value={integrations.smtp_host} onChange={e => setIntegrations({ ...integrations, smtp_host: e.target.value })} placeholder="smtp.exemplo.com" />)}
              {field("Porta", <Input value={integrations.smtp_port} onChange={e => setIntegrations({ ...integrations, smtp_port: e.target.value })} />)}
              {field("Usuário", <Input value={integrations.smtp_user} onChange={e => setIntegrations({ ...integrations, smtp_user: e.target.value })} />)}
              {field("Remetente (from)", <Input value={integrations.smtp_from} onChange={e => setIntegrations({ ...integrations, smtp_from: e.target.value })} />)}
            </div>
            <p className="text-[11px] text-muted-foreground font-dm">A senha SMTP deve ser cadastrada em segredos do backend.</p>
          </div>

          <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-barlow font-bold text-base">Pagamentos</p><p className="text-xs text-muted-foreground font-dm">Gateway para cobrança recorrente.</p></div>
              <Switch checked={integrations.payment_enabled} onCheckedChange={v => setIntegrations({ ...integrations, payment_enabled: v })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Provedor", (
                <select value={integrations.payment_provider} onChange={e => setIntegrations({ ...integrations, payment_provider: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Nenhum</option>
                  <option value="stripe">Stripe</option>
                  <option value="asaas">Asaas</option>
                  <option value="mercadopago">Mercado Pago</option>
                  <option value="pagseguro">PagSeguro</option>
                </select>
              ))}
              {field("Chave pública", <Input value={integrations.payment_key} onChange={e => setIntegrations({ ...integrations, payment_key: e.target.value })} />)}
            </div>
          </div>

          <div className="bg-card rounded-xl card-shadow p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div><p className="font-barlow font-bold text-base">Catraca</p><p className="text-xs text-muted-foreground font-dm">Integração com controle de acesso local.</p></div>
              <Switch checked={integrations.turnstile_enabled} onCheckedChange={v => setIntegrations({ ...integrations, turnstile_enabled: v })} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Fabricante/Modelo", <Input value={integrations.turnstile_provider} onChange={e => setIntegrations({ ...integrations, turnstile_provider: e.target.value })} />)}
              {field("Endpoint local (IP:porta)", <Input value={integrations.turnstile_endpoint} onChange={e => setIntegrations({ ...integrations, turnstile_endpoint: e.target.value })} placeholder="192.168.0.10:8080" />)}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button disabled={saving} onClick={() => saveKey("integrations", integrations)} className="gap-1.5"><Save size={14} /> Salvar integrações</Button>
          </div>
        </div>
      )}

      {tab === "conta" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
            <p className="font-barlow font-bold text-base">Perfil</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Nome completo", <Input value={user.full_name} onChange={e => setUser({ ...user, full_name: e.target.value })} />)}
              {field("E-mail", <Input value={user.email} disabled />)}
            </div>
            <div className="flex justify-end">
              <Button disabled={saving} onClick={updateProfile} className="gap-1.5"><Save size={14} /> Salvar perfil</Button>
            </div>
          </div>

          <div className="bg-card rounded-xl card-shadow p-5 space-y-4">
            <div className="flex items-center gap-2"><KeyRound size={16} className="text-primary" /><p className="font-barlow font-bold text-base">Trocar senha</p></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {field("Nova senha", <Input type="password" value={pw.next} onChange={e => setPw({ ...pw, next: e.target.value })} />)}
              {field("Confirmar nova senha", <Input type="password" value={pw.confirm} onChange={e => setPw({ ...pw, confirm: e.target.value })} />)}
            </div>
            <div className="flex justify-end">
              <Button disabled={saving} onClick={changePassword} className="gap-1.5"><Save size={14} /> Alterar senha</Button>
            </div>
          </div>

          <div className="bg-card rounded-xl card-shadow p-5 flex items-center justify-between">
            <div>
              <p className="font-barlow font-bold text-base">Sair da conta</p>
              <p className="text-xs text-muted-foreground font-dm">Encerra a sessão neste dispositivo.</p>
            </div>
            <Button variant="outline" onClick={signOut} className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"><LogOut size={14} /> Sair</Button>
          </div>
        </div>
      )}

      {tab === "auditoria" && <AuditLogTab />}

      {tab === "unidades" && <UnidadesTab />}

      {tab === "planos" && <PlanosTab />}
      {tab === "grade" && <GradeConfigTab />}
      {tab === "treinos" && <TreinosConfigTab />}
      {tab === "avaliacoes" && <AvaliacoesConfigTab />}
      {tab === "crm" && <CrmConfigTab />}
      {tab === "notificacoes" && <NotificacoesTab />}
    </div>
  );
};

export default Configuracoes;