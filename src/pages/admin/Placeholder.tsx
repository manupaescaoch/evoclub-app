import { useLocation } from "react-router-dom";

const titles: Record<string, { title: string; desc: string }> = {
  "/admin/gerencial": { title: "GERENCIAL", desc: "Relatórios gerenciais, metas e indicadores estratégicos." },
  "/admin/treinos": { title: "TREINOS", desc: "Prescrição, contagem de clientes e treino padrão." },
  "/admin/configuracoes": { title: "CONFIGURAÇÕES", desc: "Configurações da empresa, financeiro e vendas." },
  "/admin/novidades": { title: "NOVIDADES", desc: "Fique por dentro das últimas atualizações." },
  "/admin/ajuda": { title: "CENTRAL DE AJUDA", desc: "Documentação, tutoriais e suporte." },
};

const Placeholder = () => {
  const location = useLocation();
  const info = titles[location.pathname] || { title: "Página", desc: "Em breve." };

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
        <span className="text-primary text-2xl">🚧</span>
      </div>
      <h1 className="font-barlow font-bold text-2xl text-foreground mb-2">{info.title}</h1>
      <p className="text-sm text-muted-foreground font-dm max-w-md">{info.desc}</p>
    </div>
  );
};

export default Placeholder;
