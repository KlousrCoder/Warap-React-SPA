export type Country = { code: string; dial: string; flag: string; name: string };

// Flags via emoji (unicode flag), works without images.
export const countries: Country[] = [
  { code: "CM", dial: "+237", flag: "🇨🇲", name: "Cameroun" },
  { code: "SN", dial: "+221", flag: "🇸🇳", name: "Sénégal" },
  { code: "CI", dial: "+225", flag: "🇨🇮", name: "Côte d'Ivoire" },
  { code: "FR", dial: "+33", flag: "🇫🇷", name: "France" },
  { code: "BE", dial: "+32", flag: "🇧🇪", name: "Belgique" },
  { code: "CH", dial: "+41", flag: "🇨🇭", name: "Suisse" },
  { code: "CA", dial: "+1", flag: "🇨🇦", name: "Canada" },
  { code: "MA", dial: "+212", flag: "🇲🇦", name: "Maroc" },
  { code: "DZ", dial: "+213", flag: "🇩🇿", name: "Algérie" },
  { code: "TN", dial: "+216", flag: "🇹🇳", name: "Tunisie" },
  { code: "ML", dial: "+223", flag: "🇲🇱", name: "Mali" },
  { code: "BF", dial: "+226", flag: "🇧🇫", name: "Burkina Faso" },
  { code: "NE", dial: "+227", flag: "🇳🇪", name: "Niger" },
  { code: "TG", dial: "+228", flag: "🇹🇬", name: "Togo" },
  { code: "BJ", dial: "+229", flag: "🇧🇯", name: "Bénin" },
  { code: "GA", dial: "+241", flag: "🇬🇦", name: "Gabon" },
  { code: "CG", dial: "+242", flag: "🇨🇬", name: "Congo" },
  { code: "CD", dial: "+243", flag: "🇨🇩", name: "RD Congo" },
  { code: "GN", dial: "+224", flag: "🇬🇳", name: "Guinée" },
  { code: "MR", dial: "+222", flag: "🇲🇷", name: "Mauritanie" },
  { code: "TD", dial: "+235", flag: "🇹🇩", name: "Tchad" },
  { code: "CF", dial: "+236", flag: "🇨🇫", name: "Centrafrique" },
  { code: "RW", dial: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "BI", dial: "+257", flag: "🇧🇮", name: "Burundi" },
  { code: "MG", dial: "+261", flag: "🇲🇬", name: "Madagascar" },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "Royaume-Uni" },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "États-Unis" },
  { code: "DE", dial: "+49", flag: "🇩🇪", name: "Allemagne" },
  { code: "ES", dial: "+34", flag: "🇪🇸", name: "Espagne" },
  { code: "IT", dial: "+39", flag: "🇮🇹", name: "Italie" },
  { code: "PT", dial: "+351", flag: "🇵🇹", name: "Portugal" },
];

export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Le mot de passe doit contenir au moins 8 caractères";
  if (!/[A-Z]/.test(pw)) return "Le mot de passe doit contenir au moins une majuscule";
  if (!/[0-9]/.test(pw)) return "Le mot de passe doit contenir au moins un chiffre";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Le mot de passe doit contenir au moins un caractère spécial";
  return null;
}
