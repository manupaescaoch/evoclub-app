import { useState } from "react";
import BottomNav from "./BottomNav";
import InicioTab from "../tabs/InicioTab";
import GradeTab from "../tabs/GradeTab";
import TreinoTab from "../tabs/TreinoTab";
import ComunidadeTab from "../tabs/ComunidadeTab";
import RankingTab from "../tabs/RankingTab";
import ClubTab from "../tabs/ClubTab";
import PerfilTab from "../tabs/PerfilTab";
import NotificacoesTab from "../tabs/NotificacoesTab";
import SaudeEvolucaoTab from "../tabs/SaudeEvolucaoTab";
import PlanoTab from "../tabs/PlanoTab";
import IndicacoesTab from "../tabs/IndicacoesTab";
import DailyCheckinDialog from "../tabs/DailyCheckinDialog";
import OnboardingDialog from "../tabs/OnboardingDialog";
import { useStudent } from "@/contexts/StudentContext";

const mainTabs = ["inicio", "grade", "treino", "comunidade", "ranking", "club"] as const;
const screens = ["perfil", "notificacoes", "saude", "plano", "indicacoes"] as const;
type Tab = (typeof mainTabs)[number] | (typeof screens)[number];

const AppShell = () => {
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const { client } = useStudent();
  const onboarded = !!client?.onboarding_completed;
  const isScreen = (screens as readonly string[]).includes(activeTab);
  const go = (t: string) => setActiveTab(t as Tab);

  return (
    <div className="mx-auto max-w-[390px] min-h-screen bg-background relative">
      <OnboardingDialog />
      {onboarded && !isScreen && <DailyCheckinDialog />}
      <div className="pb-24 overflow-y-auto min-h-screen">
        {activeTab === "inicio" && <InicioTab onTabChange={go} />}
        {activeTab === "grade" && <GradeTab />}
        {activeTab === "treino" && <TreinoTab />}
        {activeTab === "comunidade" && <ComunidadeTab />}
        {activeTab === "ranking" && <RankingTab />}
        {activeTab === "club" && <ClubTab />}
        {activeTab === "perfil" && <PerfilTab onBack={() => setActiveTab("inicio")} onNavigate={go} />}
        {activeTab === "notificacoes" && (
          <NotificacoesTab onBack={() => setActiveTab("inicio")} onNavigate={go} />
        )}
        {activeTab === "saude" && <SaudeEvolucaoTab onBack={() => setActiveTab("inicio")} />}
        {activeTab === "plano" && <PlanoTab onBack={() => setActiveTab("perfil")} />}
        {activeTab === "indicacoes" && <IndicacoesTab onBack={() => setActiveTab("perfil")} />}
      </div>
      {!isScreen && <BottomNav activeTab={activeTab} onTabChange={go} />}
    </div>
  );
};

export default AppShell;
