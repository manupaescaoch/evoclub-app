import { Link } from "react-router-dom";
import { FileSignature, CalendarRange, UserCog, Truck, ShieldCheck, Tag, Ticket, TrendingUp } from "lucide-react";

const items = [
  { label: "Contratos", desc: "Modelos e regras contratuais", path: "/admin/gerencial/contratos", icon: FileSignature },
  { label: "Atividades na Grade", desc: "Atividades disponíveis na grade", path: "/admin/gerencial/atividades", icon: CalendarRange },
  { label: "Colaboradores", desc: "Gestão da equipe", path: "/admin/gerencial/colaboradores", icon: UserCog },
  { label: "Fornecedores", desc: "Cadastro de fornecedores", path: "/admin/gerencial/fornecedores", icon: Truck },
  { label: "Permissões", desc: "Perfis de acesso", path: "/admin/gerencial/permissoes", icon: ShieldCheck },
  { label: "Serviços", desc: "Serviços de cobrança e recibos", path: "/admin/gerencial/servicos", icon: Tag },
  { label: "Cupons de Desconto", desc: "Vouchers e benefícios", path: "/admin/gerencial/cupons", icon: Ticket },
  { label: "Crescimento", desc: "Entradas, saídas e churn", path: "/admin/gerencial/crescimento", icon: TrendingUp },
];

export default function GerencialIndex() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-barlow font-bold text-2xl md:text-3xl text-foreground">Gerencial</h1>
        <p className="text-sm text-muted-foreground font-dm mt-1">Central de administração da operação.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {items.map(it => (
          <Link key={it.path} to={it.path} className="group bg-card border border-border rounded-xl p-4 hover:border-primary hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
              <it.icon size={20} />
            </div>
            <p className="font-barlow font-bold text-base text-foreground">{it.label}</p>
            <p className="text-xs text-muted-foreground font-dm mt-1">{it.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}