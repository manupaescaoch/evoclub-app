import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useGamification } from "@/hooks/useGamification";
import AchievementIcon from "./AchievementIcon";

/** Celebração exibida quando novas conquistas são desbloqueadas. */
const AchievementUnlockDialog = () => {
  const { justUnlocked, dismissUnlocked } = useGamification();
  const open = justUnlocked.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && dismissUnlocked()}>
      <DialogContent className="max-w-[330px] rounded-2xl">
        <div className="text-center pt-2">
          <p className="font-barlow text-[10px] tracking-[2px] uppercase text-primary mb-1">
            Nova conquista
          </p>
          <p className="font-barlow font-[800] text-2xl text-foreground mb-4">Parabéns!</p>
          <div className="space-y-2">
            {justUnlocked.map((a) => (
              <div key={a.code} className="flex items-center gap-3 rounded-xl bg-card border border-primary/40 p-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
                  <AchievementIcon icon={a.icon} size={20} />
                </div>
                <div>
                  <p className="font-barlow font-bold text-sm text-foreground">{a.name}</p>
                  <p className="text-muted text-xs font-dm">
                    {a.description}
                    {a.xp_bonus > 0 ? ` · +${a.xp_bonus} Score` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Button className="w-full mt-5" onClick={dismissUnlocked}>
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AchievementUnlockDialog;
