import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo-evo.png";

const RoleSelect = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center px-6">
      {/* Decorative diagonal lines — top right */}
      <div className="absolute top-0 right-0 w-64 h-64 -translate-y-12 translate-x-12 rotate-[-30deg] opacity-[0.07]">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="h-[3px] bg-primary mb-[9px]" />
        ))}
      </div>

      {/* Decorative diagonal lines — bottom left */}
      <div className="absolute bottom-0 left-0 w-64 h-64 translate-y-12 -translate-x-12 rotate-[-30deg] opacity-[0.07]">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="h-[3px] bg-primary mb-[9px]" />
        ))}
      </div>

      {/* Logo + branding */}
      <div className="flex flex-col items-center mb-10 z-10">
        <img src={logo} alt="EVO Training Club" className="w-24 h-24 rounded-2xl mb-5 hero-shadow" />
        <div className="flex items-baseline gap-1.5">
          <span className="font-barlow font-black text-3xl tracking-tight text-foreground">IRON</span>
          <span className="font-barlow font-bold text-3xl tracking-tight text-muted-foreground">FIT</span>
        </div>
        <p className="text-sm text-muted-foreground font-dm mt-1">O seu app</p>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm space-y-3 z-10">
        <button
          onClick={() => navigate("/aluno")}
          className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-dm font-semibold text-base cta-shadow hover:opacity-90 transition-opacity"
        >
          Sou aluno
        </button>
        <button
          onClick={() => navigate("/admin/login")}
          className="w-full py-4 rounded-xl bg-[#1E1E2E] text-white font-dm font-semibold text-base hover:bg-[#2a2a3e] transition-colors"
        >
          Sou profissional Iron
        </button>
      </div>
    </div>
  );
};

export default RoleSelect;
