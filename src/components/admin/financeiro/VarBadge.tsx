import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmtVar } from "@/lib/finance";

type Props = {
  value: number;
  /** despesa: subir é ruim, então a cor se inverte */
  invert?: boolean;
  label?: string;
  className?: string;
};

const VarBadge = ({ value, invert, label = "vs mês anterior", className = "" }: Props) => {
  const flat = Math.abs(value) < 0.05;
  const good = invert ? value < 0 : value > 0;
  const color = flat ? "text-muted-foreground" : good ? "text-green-600" : "text-red-500";
  const Icon = flat ? Minus : value > 0 ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-dm font-medium ${color} ${className}`}>
      <Icon size={12} />
      {flat ? "estável" : fmtVar(value)}
      {label && <span className="text-muted-foreground font-normal">{label}</span>}
    </span>
  );
};

export default VarBadge;
