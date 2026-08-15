import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import logoAsset from "@/assets/logo-evo.png.asset.json";

const AlunoLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      setLoading(false);
      toast.error("Não foi possível entrar: " + error.message);
      return;
    }
    await supabase.rpc("link_client_by_email", { _email: email.trim().toLowerCase() });
    setLoading(false);
    navigate("/aluno", { replace: true });
  };

  return (
    <div className="mx-auto max-w-[390px] min-h-screen min-h-[100dvh] bg-background flex flex-col justify-center px-6">
      <div className="flex flex-col items-center mb-8">
        <img src={logoAsset.url} alt="EVO Club" className="w-16 h-16 rounded-2xl mb-3 hero-shadow" />
        <h1 className="font-barlow font-bold text-2xl text-foreground">EVO CLUB</h1>
        <p className="text-sm text-muted-foreground font-dm">Área do aluno</p>
      </div>

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
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-dm font-semibold text-base cta-shadow disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>

      <p className="text-center text-sm font-dm text-muted-foreground mt-5">
        Primeiro acesso?{" "}
        <Link to="/aluno/cadastro" className="text-primary font-semibold">
          Criar conta
        </Link>
      </p>
    </div>
  );
};

export default AlunoLogin;