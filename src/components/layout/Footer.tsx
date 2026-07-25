import { Link } from "react-router-dom";
import { HardHat } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary text-secondary-foreground">
      <div className="container mx-auto grid gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <HardHat className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-bold">WARAP</span>
          </div>
          <p className="mt-3 text-sm text-secondary-foreground/70">
            La marketplace BTP qui connecte les pros du bâtiment et les clients exigeants.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary-foreground/60">Plateforme</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/services" className="hover:text-primary">Services</Link></li>
            <li><Link to="/register" className="hover:text-primary">Devenir prestataire</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary-foreground/60">Entreprise</h4>
          <ul className="space-y-2 text-sm text-secondary-foreground/80">
            <li><Link to="/contact" className="hover:text-primary">Nous contacter</Link></li>
            <li>Carrières</li><li>Presse</li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary-foreground/60">Légal</h4>
          <ul className="space-y-2 text-sm">
            <li><Link to="/cgu" className="hover:text-primary">Conditions d'utilisation</Link></li>
            <li><Link to="/confidentialite" className="hover:text-primary">Politique de confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-secondary-foreground/50">
        © 2026 WARAP. Tous droits réservés.
      </div>
    </footer>
  );
}
