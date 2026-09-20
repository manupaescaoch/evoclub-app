import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Upload, ChevronRight } from "lucide-react";

export default function NovaAvaliacaoDialog({
  onClose, onManual, onImport, creating,
}: { onClose: () => void; onManual: () => void; onImport: () => void; creating?: boolean }) {
  const Option = ({
    icon, title, desc, onClick, disabled,
  }: { icon: React.ReactNode; title: string; desc: string; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled}
      className="w-full flex items-center gap-3 rounded-xl border border-border p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-60">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-barlow font-bold text-sm text-foreground">{title}</span>
        <span className="block text-[11px] font-dm text-muted-foreground">{desc}</span>
      </span>
      <ChevronRight size={16} className="text-muted-foreground shrink-0" />
    </button>
  );

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-barlow">NOVA AVALIAÇÃO</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Option icon={<ClipboardList size={18} />} title="PREENCHER MANUALMENTE"
            desc="Registrar medidas e bioimpedância na mão" onClick={onManual} disabled={creating} />
          <Option icon={<Upload size={18} />} title="IMPORTAR AVALIAÇÃO"
            desc="Enviar laudo InBody em PDF, PNG ou JPG" onClick={onImport} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
