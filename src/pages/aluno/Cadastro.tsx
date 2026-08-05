import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logoAsset from "@/assets/logo-evo.png.asset.json";

const AlunoCadastro = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (password.length < 6) {
      toast.error("A senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem");
      return;
    }
    setLoading(true);
    setBlocked(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: mail,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (signUpError) {
      setLoading(false);
      toast.error("Não foi possível criar a conta: " + signUpError.message);
      return;
    }

    // Com confirmação automática ativa, o cadastro já cria a sessão.
    const { data: sess } = await supabase.auth.getSession();
    if (!sess.session) {
      await supabase.auth.signInWithPassword({ email: mail, password });
    }

    const { data, error } = await supabase.rpc("link_client_by_email", { _email: mail });
    setLoading(false);

    const result = (data ?? {}) as { ok?: boolean; reason?: string };
    if (error || !result.ok) {
      await supabase.auth.signOut();
      setBlocked(
        result.reason === "already_linked"
          ? "Este e-mail já está vinculado a outra conta. Fale com a recepção da sua unidade."
          : "Não encontramos um cadastro de aluno com este e-mail. Fale com a recepção da sua unidade para liberar seu acesso."
      );
      return;
    }

    toast.success("Conta criada! Bem-vindo ao EVO Training Club.");
    navigate("/aluno", { replace: true });
  };

  return (
    <div className="mx-auto max-w-[390px] min-h-screen bg-background flex flex-col justify-center px-6">
      <div className="flex flex-col items-center mb-8">
        <img src={logoAsset.url} alt="EVO Training Club" className="w-16 h-16 rounded-2xl mb-3 hero-shadow" />
        <h1 className="font-barlow font-bold text-2xl text-foreground">CRIAR CONTA</h1>
        <p className="text-sm text-muted-foreground font-dm text-center mt-1">
          Use o mesmo e-mail cadastrado na sua unidade.
        </p>
      </div>

      {blocked && (
        <div className="mb-4 rounded-2xl bg-card card-shadow p-4 text-sm font-dm text-foreground">
          {blocked}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <Input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <Input
          type="password"
          placeholder="Confirmar senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-base cta-shadow disabled:opacity-50"
        >
          {loading ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="text-center text-sm font-dm text-muted-foreground mt-5">
        Já tem conta?{" "}
        <Link to="/aluno/login" className="text-primary font-semibold">
          Entrar
        </Link>
      </p>
    </div>
  );
};

export default AlunoCadastro;