import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import RoleSelect from "./pages/RoleSelect.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Login from "./pages/admin/Login.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import Clientes from "./pages/admin/Clientes.tsx";
import Grade from "./pages/admin/Grade.tsx";
import CRM from "./pages/admin/CRM.tsx";
import FinanceiroLayout from "./components/admin/financeiro/FinanceiroLayout.tsx";
import FinDashboard from "./pages/admin/financeiro/Dashboard.tsx";
import FluxoCaixa from "./pages/admin/financeiro/FluxoCaixa.tsx";
import Recebimentos from "./pages/admin/financeiro/Recebimentos.tsx";
import ContasAPagar from "./pages/admin/financeiro/ContasAPagar.tsx";
import Transacoes from "./pages/admin/financeiro/Transacoes.tsx";
import Folha from "./pages/admin/financeiro/Folha.tsx";
import DRE from "./pages/admin/financeiro/DRE.tsx";
import Relatorios from "./pages/admin/financeiro/Relatorios.tsx";
import FinConfiguracoes from "./pages/admin/financeiro/Configuracoes.tsx";
import { UnitProvider } from "./contexts/UnitContext.tsx";
import { AccessProvider } from "./contexts/AccessContext.tsx";
import { PeriodProvider } from "./contexts/PeriodContext.tsx";
import ModuleGuard from "./components/admin/ModuleGuard.tsx";
import Avaliacoes from "./pages/admin/Avaliacoes.tsx";
import Equipe from "./pages/admin/Equipe.tsx";
import Ocorrencias from "./pages/admin/Ocorrencias.tsx";
import Placeholder from "./pages/admin/Placeholder.tsx";
import Treinos from "./pages/admin/Treinos.tsx";
import TreinosDashboard from "./pages/admin/TreinosDashboard.tsx";
import TreinosFichas from "./pages/admin/TreinosFichas.tsx";
import TreinosBiblioteca from "./pages/admin/TreinosBiblioteca.tsx";
import TreinosMetodos from "./pages/admin/TreinosMetodos.tsx";
import PrescreverTreino from "./pages/admin/PrescreverTreino.tsx";
import PrescreverEditor from "./pages/admin/PrescreverEditor.tsx";
import GerencialIndex from "./pages/admin/gerencial/GerencialIndex.tsx";
import Contratos from "./pages/admin/gerencial/Contratos.tsx";
import Atividades from "./pages/admin/gerencial/Atividades.tsx";
import Colaboradores from "./pages/admin/gerencial/Colaboradores.tsx";
import Fornecedores from "./pages/admin/gerencial/Fornecedores.tsx";
import Permissoes from "./pages/admin/gerencial/Permissoes.tsx";
import Servicos from "./pages/admin/gerencial/Servicos.tsx";
import Cupons from "./pages/admin/gerencial/Cupons.tsx";
import Crescimento from "./pages/admin/gerencial/Crescimento.tsx";
import Comissoes from "./pages/admin/crm/Comissoes.tsx";
import Indicacoes from "./pages/admin/crm/Indicacoes.tsx";
import Tarefas from "./pages/admin/crm/Tarefas.tsx";
import Operacional from "./pages/admin/crm/Operacional.tsx";
import Escala from "./pages/admin/crm/Escala.tsx";
import ValidarResgate from "./pages/admin/club/ValidarResgate";
import Configuracoes from "./pages/admin/Configuracoes.tsx";
import AdminComunidade from "./pages/admin/Comunidade.tsx";
import AlunoLogin from "./pages/aluno/Login.tsx";
import AlunoCadastro from "./pages/aluno/Cadastro.tsx";
import StudentGuard from "./components/auth/StudentGuard.tsx";
import { StudentProvider } from "./contexts/StudentContext.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
       <AccessProvider>
       <PeriodProvider>
       <UnitProvider>
        <Routes>
          {/* Role selection (landing) */}
          <Route path="/" element={<RoleSelect />} />

          {/* Student app */}
          <Route
            path="/aluno/login"
            element={
              <StudentProvider>
                <AlunoLogin />
              </StudentProvider>
            }
          />
          <Route
            path="/aluno/cadastro"
            element={
              <StudentProvider>
                <AlunoCadastro />
              </StudentProvider>
            }
          />
          <Route
            path="/aluno"
            element={
              <StudentProvider>
                <StudentGuard>
                  <Index />
                </StudentGuard>
              </StudentProvider>
            }
          />

          {/* Admin */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<ModuleGuard module="dashboard"><Dashboard /></ModuleGuard>} />
            <Route path="clientes" element={<ModuleGuard module="clientes"><Clientes /></ModuleGuard>} />
            <Route path="grade" element={<ModuleGuard module="grade"><Grade /></ModuleGuard>} />
            <Route path="crm" element={<ModuleGuard module="crm"><CRM /></ModuleGuard>} />
            <Route path="crm/comissoes" element={<ModuleGuard module="crm"><Comissoes /></ModuleGuard>} />
            <Route path="crm/indicacoes" element={<ModuleGuard module="crm"><Indicacoes /></ModuleGuard>} />
            <Route path="crm/tarefas" element={<ModuleGuard module="crm"><Tarefas /></ModuleGuard>} />
            {/* rotas antigas mantidas com redirect */}
            <Route path="crm/operacional" element={<Navigate to="/admin/operacional" replace />} />
            <Route path="crm/escala" element={<Navigate to="/admin/equipe/escala" replace />} />

            <Route path="avaliacoes" element={<ModuleGuard module="avaliacao"><Avaliacoes /></ModuleGuard>} />
            <Route path="equipe" element={<ModuleGuard module="equipe"><Equipe /></ModuleGuard>} />
            <Route path="equipe/escala" element={<ModuleGuard module="equipe"><Escala /></ModuleGuard>} />
            <Route path="operacional" element={<ModuleGuard module="operacional"><Operacional /></ModuleGuard>} />
            <Route path="ocorrencias" element={<ModuleGuard module="ocorrencias"><Ocorrencias /></ModuleGuard>} />

            <Route path="financeiro" element={<ModuleGuard module="financeiro"><FinanceiroLayout /></ModuleGuard>}>
              <Route index element={<FinDashboard />} />
              <Route path="fluxo" element={<FluxoCaixa />} />
              <Route path="recebimentos" element={<Recebimentos />} />
              <Route path="contas-a-pagar" element={<ContasAPagar />} />
              <Route path="transacoes" element={<Transacoes />} />
              <Route path="folha" element={<Folha />} />
              <Route path="dre" element={<DRE />} />
              <Route path="relatorios" element={<Relatorios />} />
              <Route path="configuracoes" element={<FinConfiguracoes />} />
            </Route>
            <Route path="gerencial" element={<ModuleGuard module="gerencial"><GerencialIndex /></ModuleGuard>} />
            <Route path="gerencial/contratos" element={<ModuleGuard module="gerencial"><Contratos /></ModuleGuard>} />
            <Route path="gerencial/atividades" element={<ModuleGuard module="gerencial"><Atividades /></ModuleGuard>} />
            <Route path="gerencial/colaboradores" element={<ModuleGuard module="gerencial"><Colaboradores /></ModuleGuard>} />
            <Route path="gerencial/fornecedores" element={<ModuleGuard module="gerencial"><Fornecedores /></ModuleGuard>} />
            <Route path="gerencial/permissoes" element={<ModuleGuard module="gerencial" action="sensitive"><Permissoes /></ModuleGuard>} />
            <Route path="gerencial/servicos" element={<ModuleGuard module="gerencial"><Servicos /></ModuleGuard>} />
            <Route path="gerencial/cupons" element={<ModuleGuard module="gerencial"><Cupons /></ModuleGuard>} />
            <Route path="gerencial/crescimento" element={<ModuleGuard module="gerencial"><Crescimento /></ModuleGuard>} />
            <Route path="treinos" element={<ModuleGuard module="treinos"><Treinos /></ModuleGuard>}>
              <Route index element={<TreinosDashboard />} />
              <Route path="prescrever" element={<PrescreverTreino />} />
              <Route path="prescrever/:clientId" element={<PrescreverEditor />} />
              <Route path="prescrever/:clientId/:planId" element={<PrescreverEditor />} />
              <Route path="fichas" element={<TreinosFichas />} />
              <Route path="biblioteca" element={<TreinosBiblioteca />} />
              <Route path="metodos" element={<TreinosMetodos />} />
            </Route>
            <Route path="club" element={<Navigate to="/admin/club/validar" replace />} />
            <Route path="club/validar" element={<ModuleGuard module="club"><ValidarResgate /></ModuleGuard>} />
            <Route path="comunidade" element={<ModuleGuard module="comunidade"><AdminComunidade /></ModuleGuard>} />
            <Route path="configuracoes" element={<ModuleGuard module="configuracoes"><Configuracoes /></ModuleGuard>} />
            <Route path="novidades" element={<Placeholder />} />
            <Route path="ajuda" element={<Placeholder />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
       </UnitProvider>
       </PeriodProvider>
       </AccessProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
