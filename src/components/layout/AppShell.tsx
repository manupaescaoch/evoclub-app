import { useState } from "react";
import BottomNav from "./BottomNav";
import InicioTab from "../tabs/InicioTab";
import GradeTab from "../tabs/GradeTab";
import TreinoTab from "../tabs/TreinoTab";
import ComunidadeTab from "../tabs/ComunidadeTab";
import RankingTab from "../tabs/RankingTab";
import PerfilTab from "../tabs/PerfilTab";

const tabs = ["inicio", "grade", "treino", "comunidade", "ranking", "perfil"] as const;
type Tab = (typeof tabs)[number];

const AppShell = () => {
  const [activeTab, setActiveTab] = useState<Tab>("inicio");

  return (
    <div className="mx-auto max-w-[390px] min-h-screen bg-background relative">
      <div className="pb-24 overflow-y-auto min-h-screen">
        {activeTab === "inicio" && <InicioTab onTabChange={setActiveTab} />}
        {activeTab === "grade" && <GradeTab />}
        {activeTab === "treino" && <TreinoTab />}
        {activeTab === "comunidade" && <ComunidadeTab />}
        {activeTab === "ranking" && <RankingTab />}
        {activeTab === "perfil" && <PerfilTab onBack={() => setActiveTab("inicio")} />}
      </div>
      {activeTab !== "perfil" && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
};

export default AppShell;
