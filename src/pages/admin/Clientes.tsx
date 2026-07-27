import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, X, Camera } from "lucide-react";
import { toast } from "sonner";
import { logCreate } from "@/lib/audit";

type Client = {
  id: number;
  name: string;
  email: string | null;
  cpf: string | null;
  phone: string | null;
  status: string | null;
  plan: string | null;
  plan_value: number | null;
  contract_start: string | null;
  contract_end: string | null;
  created_at: string | null;
};

const statusMap: Record<string, { label: string; color: string }> = {
  AT: { label: "CL", color: "bg-green-100 text-green-700" },
  OP: { label: "OP", color: "bg-yellow-100 text-yellow-700" },
  SU: { label: "SU", color: "bg-gray-100 text-gray-600" },
  CA: { label: "CA", color: "bg-red-100 text-red-600" },
};

const emptyForm = {
  firstName: "",
  lastName: "",
  gender: "",
  phone: "",
  email: "",
  visitType: "",
  observations: "",
};

const Clientes = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"todos" | "clientes" | "oportunidades">("todos");
  const [showDrawer, setShowDrawer] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClients((data as Client[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (tab === "clientes") return matchSearch && c.status === "AT";
    if (tab === "oportunidades") return matchSearch && c.status === "OP";
    return matchSearch;
  });

  const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  const handleSave = async () => {
    if (!form.firstName || !form.lastName || !form.gender || !form.phone || !form.email || !form.visitType) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setSaving(true);
    const fullName = `${form.firstName} ${form.lastName}`;
    const { data, error } = await supabase.from("clients").insert({
      name: fullName,
      email: form.email,
      phone: form.phone,
      status: "OP",
      gender: form.gender,
      visit_type: form.visitType,
      observations: form.observations || null,
      unit_id: "a1b2c3d4-0000-0000-0000-000000000001",
    } as any).select().single();
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      logCreate("client", (data as any)?.id, `Cadastrou cliente ${fullName}`, { email: form.email, phone: form.phone, visit_type: form.visitType });
      toast.success("Cliente cadastrado com sucesso!");
      setForm(emptyForm);
      setShowDrawer(false);
      fetchClients();
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-barlow font-bold text-2xl text-foreground">Clientes</h1>
        <Button className="gap-2 font-dm" onClick={() => setShowDrawer(true)}>
          <Plus size={16} /> NOVO CADASTRO
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Pesquise por nome, sobrenome, e-mail, CPF (CIN) ou carteirinha"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <button className="text-sm font-dm text-foreground flex items-center gap-1 border border-border rounded-lg px-3 py-2">
          Unidade at... <span className="text-muted-foreground">▾</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6 border-b border-border">
          {([["todos", "Todos"], ["clientes", "Clientes"], ["oportunidades", "Oportunidades"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2 text-sm font-dm font-medium transition-colors
                ${tab === key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-sm font-dm font-bold text-foreground">{filtered.length} <span className="font-normal text-muted-foreground">resultados</span></span>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl card-shadow overflow-hidden">
        <table className="w-full text-sm font-dm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Nome</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Nome do contrato</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Cadastro</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Vencimento</th>
              <th className="text-left px-4 py-3 text-xs text-muted-foreground font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted/30 rounded animate-pulse w-20" /></td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Nenhum cliente encontrado</td></tr>
            ) : (
              filtered.map(c => {
                const st = statusMap[c.status || "OP"];
                const initials = c.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                return (
                  <tr key={c.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">{initials}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{c.id}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                        </div>
                        <p className="font-medium text-foreground uppercase text-xs">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.plan || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(c.contract_end)}</td>
                    <td className="px-4 py-3">
                      {c.status === "OP" && (
                        <Button size="sm" variant="outline" className="text-xs h-7 font-dm text-primary border-primary">CONVERTER</Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer overlay */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setShowDrawer(false)} />
          <div className="relative w-[420px] bg-card h-full shadow-xl overflow-y-auto animate-in slide-in-from-right">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="font-dm font-semibold text-lg text-foreground">Novo cadastro</h2>
              <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Photo */}
              <div className="flex items-center gap-4 bg-background rounded-xl p-4">
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                  <Camera size={20} className="text-gray-400" />
                </div>
                <button className="text-sm text-primary font-dm font-medium">Foto de perfil</button>
              </div>

              {/* Nome */}
              <div>
                <label className="text-sm font-dm text-foreground">Nome <span className="text-red-500">*</span></label>
                <Input
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="mt-1"
                  placeholder="Nome"
                />
              </div>

              {/* Sobrenome */}
              <div>
                <label className="text-sm font-dm text-foreground">Sobrenome <span className="text-red-500">*</span></label>
                <Input
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="mt-1"
                  placeholder="Sobrenome"
                />
              </div>

              {/* Gênero */}
              <div>
                <label className="text-sm font-dm text-foreground">Gênero <span className="text-red-500">*</span></label>
                <select
                  value={form.gender}
                  onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Gênero *</option>
                  <option value="masculino">Masculino</option>
                  <option value="feminino">Feminino</option>
                  <option value="outro">Outro</option>
                </select>
              </div>

              {/* Telefone */}
              <div>
                <label className="text-sm font-dm text-foreground">DDI / Telefone Celular <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mt-1">
                  <div className="flex items-center gap-1 border border-input rounded-md px-3 h-10 bg-background text-sm font-dm text-foreground shrink-0">
                    +55 <span className="text-muted-foreground">▾</span>
                  </div>
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Telefone Celular *"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-dm text-foreground">E-mail <span className="text-red-500">*</span></label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1"
                  placeholder="E-mail *"
                />
              </div>

              {/* Tipo de Visita */}
              <div>
                <label className="text-sm font-dm text-foreground">Tipo de Visita <span className="text-red-500">*</span></label>
                <select
                  value={form.visitType}
                  onChange={e => setForm(f => ({ ...f, visitType: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-dm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Tipo de Visita *</option>
                  <option value="presencial">Presencial</option>
                  <option value="online">Online</option>
                  <option value="experimental">Experimental</option>
                </select>
              </div>

              {/* Observações */}
              <div>
                <label className="text-sm font-dm text-foreground">Observações</label>
                <textarea
                  value={form.observations}
                  onChange={e => setForm(f => ({ ...f, observations: e.target.value }))}
                  className="mt-1 w-full h-28 px-3 py-2 rounded-md border border-input bg-background text-sm font-dm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Descrição"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border p-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="font-dm">
                {saving ? "SALVANDO..." : "SALVAR"}
              </Button>
              <Button variant="ghost" onClick={() => setShowDrawer(false)} className="font-dm text-muted-foreground">
                CANCELAR
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clientes;
