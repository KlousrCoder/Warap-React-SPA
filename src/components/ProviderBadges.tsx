import { BadgeCheck, GraduationCap, Hammer } from "lucide-react";
import { VERIFIED_BADGE_COLOR, readableFg } from "@/lib/badges";

// Deterministic vibrant color that changes at every increment of `n`.
function worksBadgeColor(n: number): string {
  // Golden-angle hue rotation gives a distinct color for each successive count.
  const h = Math.floor((n * 137.508) % 360);
  const s = 70;
  const l = 45;
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (k: number) => {
    const x = (k + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(x - 3, Math.min(9 - x, 1)));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export type DiplomaBadge = { id: string; title: string; badge_color: string };

export function ProviderBadges({
  verified,
  diplomas,
  worksCount = 0,
  size = "md",
}: {
  verified?: boolean;
  diplomas: DiplomaBadge[];
  worksCount?: number;
  size?: "sm" | "md";
}) {
  if (!verified && diplomas.length === 0 && worksCount === 0) return null;
  const px = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {verified && (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold shadow-sm ${px}`}
          style={{ backgroundColor: VERIFIED_BADGE_COLOR, color: readableFg(VERIFIED_BADGE_COLOR) }}
          title="Identité vérifiée"
        >
          <BadgeCheck className="h-3 w-3" /> Vérifié
        </span>
      )}
      {worksCount > 0 && (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold shadow-sm ${px}`}
          style={{ backgroundColor: worksBadgeColor(worksCount), color: readableFg(worksBadgeColor(worksCount)) }}
          title={`${worksCount} réalisation${worksCount > 1 ? "s" : ""} validée${worksCount > 1 ? "s" : ""} par l'administration`}
        >
          <Hammer className="h-3 w-3" /> {worksCount} réalisation{worksCount > 1 ? "s" : ""}
        </span>
      )}
      {diplomas.map((d) => (
        <span
          key={d.id}
          className={`inline-flex items-center gap-1 rounded-full font-semibold shadow-sm ${px}`}
          style={{ backgroundColor: d.badge_color, color: readableFg(d.badge_color) }}
          title={d.title}
        >
          <GraduationCap className="h-3 w-3" />
          <span className="max-w-[140px] truncate">{d.title}</span>
        </span>
      ))}
    </div>
  );
}
