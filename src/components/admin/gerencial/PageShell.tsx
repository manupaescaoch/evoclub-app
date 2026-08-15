import { forwardRef, ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PageShellProps {
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  filters?: ReactNode;
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  summary?: ReactNode;
  children: ReactNode;
}

const PageShell = forwardRef<HTMLDivElement, PageShellProps>(function PageShell(
  { title, description, primaryAction, filters, search, summary, children },
  ref,
) {
  return (
    <div ref={ref} className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div>
          <h1 className="font-barlow font-bold text-2xl md:text-3xl text-foreground leading-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground font-dm mt-1">{description}</p>
          )}
        </div>
        {primaryAction && <div className="shrink-0">{primaryAction}</div>}
      </div>

      {(filters || search) && (
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {search && (
            <div className="relative flex-1 md:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                placeholder={search.placeholder ?? "Buscar..."}
                className="pl-9 h-9 font-dm"
              />
            </div>
          )}
          {filters && <div className="flex flex-wrap gap-2 items-center">{filters}</div>}
        </div>
      )}

      {summary && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{summary}</div>}

      {children}
    </div>
  );
});

export default PageShell;

type SummaryCardProps = { label: string; value: string | number; accent?: "default" | "green" | "red" | "yellow" | "blue" };

export const SummaryCard = forwardRef<HTMLDivElement, SummaryCardProps>(function SummaryCard(
  { label, value, accent = "default" },
  ref,
) {
  const accentMap: Record<string, string> = {
    default: "bg-card border-border",
    green: "bg-green-50 border-green-200",
    red: "bg-red-50 border-red-200",
    yellow: "bg-amber-50 border-amber-200",
    blue: "bg-blue-50 border-blue-200",
  };
  const valueColor: Record<string, string> = {
    default: "text-foreground",
    green: "text-green-700",
    red: "text-red-700",
    yellow: "text-amber-700",
    blue: "text-blue-700",
  };
  return (
    <div ref={ref} className={`rounded-xl border p-4 ${accentMap[accent]}`}>
      <p className="text-xs font-dm text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`font-barlow font-bold text-2xl mt-1 ${valueColor[accent]}`}>{value}</p>
    </div>
  );
});

export const StatusBadge = forwardRef<HTMLSpanElement, { status: string }>(function StatusBadge({ status }, ref) {
  const isActive = status === "active" || status === "ativo";
  return (
    <span ref={ref} className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-dm font-medium ${
      isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
    }`}>
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
});

export const EmptyState = forwardRef<HTMLDivElement, { message?: string }>(function EmptyState(
  { message = "Nenhum registro encontrado." },
  ref,
) {
  return (
    <div ref={ref} className="text-center py-12 text-sm text-muted-foreground font-dm">
      {message}
    </div>
  );
});

export const LoadingState = forwardRef<HTMLDivElement, Record<string, never>>(function LoadingState(_props, ref) {
  return <div ref={ref} className="text-center py-12 text-sm text-muted-foreground font-dm">Carregando...</div>;
});