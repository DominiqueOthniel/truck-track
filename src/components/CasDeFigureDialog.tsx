import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CAS_DE_FIGURE } from '@/lib/cas-de-figure';
import { ListChecks } from 'lucide-react';

interface CasDeFigureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CasDeFigureDialog({ open, onOpenChange }: CasDeFigureDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-primary" />
            20 cas de figure (tests / recette)
          </DialogTitle>
          <DialogDescription>
            Scénarios à parcourir sur chaque écran pour valider le comportement métier (manuel).
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] px-6 py-4">
          <ol className="space-y-4 pr-3">
            {CAS_DE_FIGURE.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-mono text-xs text-muted-foreground">#{c.id}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {c.ecran}
                  </Badge>
                  <span className="font-semibold text-foreground">{c.titre}</span>
                </div>
                <p className="text-muted-foreground mb-2">{c.description}</p>
                <p className="text-xs border-l-2 border-primary/40 pl-2 text-foreground/90">
                  <span className="font-medium text-primary">Attendu : </span>
                  {c.resultatAttendu}
                </p>
              </li>
            ))}
          </ol>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
