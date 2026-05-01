import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Library, Sparkles } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onManual: () => void;
  onLibrary: () => void;
};

const NewPlanDialog = ({ open, onClose, onManual, onLibrary }: Props) => (
  <Dialog open={open} onOpenChange={v => !v && onClose()}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="font-barlow font-bold text-lg">Novo Plano de Treino</DialogTitle>
      </DialogHeader>
      <div className="space-y-3 py-2">
        <button onClick={onManual}
          className="w-full border-2 border-primary/30 hover:border-primary rounded-xl p-4 flex items-center gap-3 transition-colors text-left">
          <Pencil className="w-7 h-7 text-primary shrink-0" />
          <div>
            <p className="font-barlow font-bold text-sm text-foreground">Criar manualmente</p>
            <p className="font-dm text-xs text-muted-foreground">Monte o treino exercício por exercício</p>
          </div>
        </button>
        <button onClick={onLibrary}
          className="w-full border-2 border-border hover:border-primary/50 rounded-xl p-4 flex items-center gap-3 transition-colors text-left">
          <Library className="w-7 h-7 text-primary shrink-0" />
          <div>
            <p className="font-barlow font-bold text-sm text-foreground">Usar da biblioteca</p>
            <p className="font-dm text-xs text-muted-foreground">Reaplique uma ficha salva e edite</p>
          </div>
        </button>
        <button disabled
          className="w-full border-2 border-border rounded-xl p-4 flex items-center gap-3 opacity-60 cursor-not-allowed text-left">
          <Sparkles className="w-7 h-7 text-primary shrink-0" />
          <div>
            <p className="font-barlow font-bold text-sm text-foreground">
              Assistente MP TREINO <span className="text-[10px] text-primary ml-1">EM BREVE</span>
            </p>
            <p className="font-dm text-xs text-muted-foreground">IA gera sugestão por objetivo do aluno</p>
          </div>
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

export default NewPlanDialog;