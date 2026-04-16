import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/admin/StatCard";

const gateways = ["Stone", "Cielo", "Rede", "Bin", "Getnet", "Safrapay", "GlobalPayments"];
const taxas = [
  { cond: "Débito", taxa: "1.54%" },
  { cond: "1X", taxa: "2.69%" },
  { cond: "2X", taxa: "2.79%" },
  { cond: "3X", taxa: "2.89%" },
  { cond: "4X", taxa: "2.99%" },
  { cond: "5X", taxa: "3.09%" },
];

const Financeiro = () => {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from("sales").select("value");
      const total = (data || []).reduce((s, v) => s + (Number(v.value) || 0), 0);
      setTotalRevenue(total);
      setLoading(false);
    };
    fetch();
  }, []);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;

  return (
    <div>
      <h1 className="font-barlow font-bold text-2xl text-foreground mb-6">FINANCEIRO</h1>

      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-card rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard label="Receita Bruta" value={fmt(totalRevenue)} accent trend="up" trendValue="+8%" />
          <StatCard label="A Receber" value={fmt(Math.round(totalRevenue * 0.15))} />
          <StatCard label="Inadimplência" value={fmt(Math.round(totalRevenue * 0.08))} trend="down" trendValue="-2%" />
        </div>
      )}

      <div className="bg-card rounded-xl p-5 card-shadow">
        <p className="text-sm font-dm font-semibold text-foreground mb-4">Cartões e Gateways de Pagamento</p>

        {/* Gateway logos */}
        <div className="flex gap-4 mb-6 overflow-x-auto pb-2">
          {gateways.map(g => (
            <div key={g} className="px-4 py-2 bg-background rounded-lg border border-border text-xs font-dm font-medium text-foreground shrink-0">
              {g}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {["VISA", "MasterCard"].map(brand => (
            <div key={brand}>
              <p className="text-sm font-dm font-semibold text-foreground mb-2">{brand}</p>
              <table className="w-full text-xs font-dm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">Condições</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Taxas</th>
                  </tr>
                </thead>
                <tbody>
                  {taxas.map(t => (
                    <tr key={t.cond} className="border-b border-border">
                      <td className="py-2 text-foreground">{t.cond}</td>
                      <td className="py-2 text-right text-muted-foreground">{t.taxa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Financeiro;
