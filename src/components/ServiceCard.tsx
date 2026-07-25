import { Button } from "@/components/ui/button";
import { Pencil, Trash2, Wrench } from "lucide-react";

export type Service = { id: string; title: string; price: string; desc: string };

export function ServiceCard({ s, editable }: { s: Service; editable?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
            <Wrench className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold">{s.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
          </div>
        </div>
        <div className="shrink-0 font-display font-bold text-primary">{s.price}</div>
      </div>
      {editable && (
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" className="h-8"><Pencil className="mr-1.5 h-3 w-3" /> Modifier</Button>
          <Button size="sm" variant="ghost" className="h-8 text-destructive"><Trash2 className="mr-1.5 h-3 w-3" /> Supprimer</Button>
        </div>
      )}
    </div>
  );
}
