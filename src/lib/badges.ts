// Fixed color used for the "Identité vérifiée" (KYC) badge — same for all providers.
export const VERIFIED_BADGE_COLOR = "#16a34a";

// Generate a vibrant random hex color (HSL-based to avoid washed-out tones)
export function randomBadgeColor(): string {
  const h = Math.floor(Math.random() * 360);
  const s = 65 + Math.floor(Math.random() * 25); // 65–90%
  const l = 42 + Math.floor(Math.random() * 12); // 42–54%
  return hslToHex(h, s, l);
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// Compute readable foreground color (white or near-black) for a given hex background.
export function readableFg(hex: string): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "#1a1a1a" : "#ffffff";
}
