import { useState } from "react";
import BottomNav from "./BottomNav";
import InicioTab from "../tabs/InicioTab";
import GradeTab from "../tabs/GradeTab";
import TreinoTab from "../tabs/TreinoTab";
import ComunidadeTab from "../tabs/ComunidadeTab";
import RankingTab from "../tabs/RankingTab";
import ClubTab from "../tabs/ClubTab";
import PerfilTab from "../tabs/PerfilTab";
import DailyCheckinDialog from "../tabs/DailyCheckinDialog";
import OnboardingDialog from "../tabs/OnboardingDialog";
import { useStudent } from "@/contexts/StudentContext";

const tabs = ["inicio", "grade", "treino", "comunidade", "ranking", "club", "perfil"] as const;
type Tab = (typeof tabs)[number];

const AppShell = () => {
  const [activeTab, setActiveTab] = useState<Tab>("inicio");
  const { client } = useStudent();
  const onboarded = !!client?.onboarding_completed;

  return (
    <div className="mx-auto max-w-[390px] min-h-screen bg-background relative">
      <OnboardingDialog />
      {onboarded && <DailyCheckinDialog />}
      <div className="pb-24 overflow-y-auto min-h-screen">
        {activeTab === "inicio" && <InicioTab onTabChange={setActiveTab} />}
        {activeTab === "grade" && <GradeTab />}
        {activeTab === "treino" && <TreinoTab />}
        {activeTab === "comunidade" && <ComunidadeTab />}
        {activeTab === "ranking" && <RankingTab />}
        {activeTab === "club" && <ClubTab />}
        {activeTab === "perfil" && <PerfilTab onBack={() => setActiveTab("inicio")} />}
      </div>
      {activeTab !== "perfil" && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />}
    </div>
  );
};

export default AppShell;
