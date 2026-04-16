import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: "up" | "down";
  trendValue?: string;
  accent?: boolean;
}

const StatCard = ({ label, value, sub, trend, trendValue, accent }: StatCardProps) => (
  <div className="bg-card rounded-xl p-4 card-shadow relative overflow-hidden">
    {accent && <div className="absolute top-0 left-0 right-0 h-[3px] bg-primary" />}
    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-dm font-medium mb-1">{label}</p>
    <div className="flex items-end gap-2">
      <span className="text-[32px] leading-none font-barlow font-bold text-foreground">{value}</span>
      {trend && (
        <span className={`flex items-center gap-0.5 text-xs font-dm font-medium mb-1 ${trend === "up" ? "text-green-600" : "text-red-500"}`}>
          {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trendValue}
        </span>
      )}
    </div>
    {sub && <p className="text-[11px] text-muted-foreground font-dm mt-1">{sub}</p>}
  </div>
);

export default StatCard;
