import { Star } from "lucide-react";

export type Review = { id: string; author: string; rating: number; date: string; text: string };

export function ReviewCard({ r }: { r: Review }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{r.author}</div>
        <div className="text-xs text-muted-foreground">{r.date}</div>
      </div>
      <div className="mt-1 flex gap-0.5 text-primary">
        {Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
    </div>
  );
}
