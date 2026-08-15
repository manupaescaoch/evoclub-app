import { Navigate } from "react-router-dom";
import { useStudent } from "@/contexts/StudentContext";

const StudentGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, client, loading, signOut } = useStudent();

  if (loading) {
    return (
      <div className="mx-auto max-w-[390px] min-h-screen min-h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-sm font-dm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session) return <Navigate to="/aluno/login" replace />;

  if (!client) {
    return (
      <div className="mx-auto max-w-[390px] min-h-screen min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 text-center">
        <h1 className="font-barlow font-bold text-xl text-foreground">CADASTRO NÃO VINCULADO</h1>
        <p className="text-sm font-dm text-muted-foreground mt-2">
          Não encontramos seu cadastro de aluno com este e-mail. Fale com a recepção da sua unidade
          para liberar o acesso.
        </p>
        <button
          onClick={signOut}
          className="mt-6 w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-sm cta-shadow"
        >
          Sair
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default StudentGuard;