import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Financeiro from "./pages/admin/Financeiro.tsx";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Role selection (landing) */}
          <Route path="/" element={<RoleSelect />} />

          {/* Student app */}
          <Route path="/aluno" element={<Index />} />

          {/* Admin */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="grade" element={<Grade />} />
            <Route path="crm" element={<CRM />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="gerencial" element={<GerencialIndex />} />
            <Route path="gerencial/contratos" element={<Contratos />} />
            <Route path="gerencial/atividades" element={<Atividades />} />
            <Route path="gerencial/colaboradores" element={<Colaboradores />} />
            <Route path="gerencial/fornecedores" element={<Fornecedores />} />
            <Route path="gerencial/permissoes" element={<Permissoes />} />
            <Route path="gerencial/servicos" element={<Servicos />} />
            <Route path="gerencial/cupons" element={<Cupons />} />
            <Route path="gerencial/crescimento" element={<Crescimento />} />
            <Route path="treinos" element={<Treinos />}>
              <Route index element={<TreinosDashboard />} />
              <Route path="prescrever" element={<PrescreverTreino />} />
              <Route path="prescrever/:clientId" element={<PrescreverEditor />} />
              <Route path="prescrever/:clientId/:planId" element={<PrescreverEditor />} />
              <Route path="fichas" element={<TreinosFichas />} />
              <Route path="biblioteca" element={<TreinosBiblioteca />} />
              <Route path="metodos" element={<TreinosMetodos />} />
            </Route>
            <Route path="configuracoes" element={<Placeholder />} />
            <Route path="novidades" element={<Placeholder />} />
            <Route path="ajuda" element={<Placeholder />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
