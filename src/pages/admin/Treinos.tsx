import { useState } from "react";
import TreinosDashboard from "./TreinosDashboard";
import TreinosAlunos from "./TreinosAlunos";
import TreinosClienteDetalhe from "./TreinosClienteDetalhe";

type View = "dashboard" | "alunos" | "detalhe";

const Treinos = () => {
  const [view, setView] = useState<View>("dashboard");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "alunos">("dashboard");

  const handleSelectClient = (id: number) => {
    setSelectedClientId(id);
    setView("detalhe");
  };

  const handleBackToAlunos = () => {
    setView("alunos");
    setSelectedClientId(null);
  };

  if (view === "detalhe" && selectedClientId) {
    return <TreinosClienteDetalhe clientId={selectedClientId} onBack={handleBackToAlunos} />;
  }

  return (
    <div>
      {/* Sub-navigation */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { setActiveTab("dashboard"); setView("dashboard"); }}
          className={`px-4 py-1.5 rounded-full text-xs font-dm font-bold uppercase tracking-wide transition-colors
            ${activeTab === "dashboard" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => { setActiveTab("alunos"); setView("alunos"); }}
          className={`px-4 py-1.5 rounded-full text-xs font-dm font-bold uppercase tracking-wide transition-colors
            ${activeTab === "alunos" ? "bg-primary text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
        >
          Alunos
        </button>
      </div>

      {activeTab === "dashboard" ? <TreinosDashboard /> : <TreinosAlunos onSelectClient={handleSelectClient} />}
    </div>
  );
};

export default Treinos;
