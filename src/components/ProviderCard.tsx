import { Link } from "react-router-dom";
import { Star, MapPin, BadgeCheck, Circle } from "lucide-react";
import type { Provider } from "@/lib/mock-data";

export function ProviderCard({ p }: { p: Provider }) {
  return (
    <Link
      to={`/providers/${p.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      <div className="flex items-start gap-3 p-4">
        <img src={p.avatar} alt={p.name} className="h-14 w-14 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-semibold">{p.name}</h3>
            {p.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
          </div>
          <p className="text-sm text-muted-foreground">{p.trade}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{p.location}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-3 text-sm">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-primary text-primary" />
          <span className="font-semibold">{p.rating}</span>
          <span className="text-muted-foreground">({p.reviews})</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <Circle className={`h-2 w-2 ${p.available ? "fill-success text-success" : "fill-muted-foreground text-muted-foreground"}`} />
          <span className="text-muted-foreground">{p.available ? "Disponible" : "Occupé"}</span>
        </div>
        <div className="font-semibold text-foreground">{p.hourlyRate}€<span className="text-xs font-normal text-muted-foreground">/h</span></div>
      </div>
    </Link>
  );
}
