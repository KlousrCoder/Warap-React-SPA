import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : juin 2026</p>

        <div className="prose prose-sm mt-8 max-w-none text-foreground/90">
          <h2 className="mt-8 font-display text-xl font-bold">1. Responsable du traitement</h2>
          <p>WARAP est responsable du traitement des données personnelles collectées sur la plateforme.</p>

          <h2 className="mt-6 font-display text-xl font-bold">2. Données collectées</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Identité : nom, prénom, photo, ville</li>
            <li>Contact : email, téléphone</li>
            <li>Compte : mot de passe (haché), rôle, catégorie professionnelle</li>
            <li>Documents KYC pour les prestataires (visibles uniquement par les administrateurs)</li>
            <li>Contenus publiés : services, réalisations, messages, avis</li>
            <li>Historique des transactions en jetons</li>
          </ul>

          <h2 className="mt-6 font-display text-xl font-bold">3. Finalités</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>Création et gestion du compte utilisateur</li>
            <li>Mise en relation des clients et prestataires</li>
            <li>Sécurité, lutte contre la fraude, vérification d'identité</li>
            <li>Notifications transactionnelles</li>
            <li>Amélioration du service</li>
          </ul>

          <h2 className="mt-6 font-display text-xl font-bold">4. Destinataires</h2>
          <p>Les données ne sont accessibles qu'aux équipes WARAP, à l'utilisateur concerné, et aux autres utilisateurs uniquement pour les informations rendues publiques par l'utilisateur (profil prestataire publié, services, portfolio, avis). Les documents KYC sont strictement réservés aux administrateurs.</p>

          <h2 className="mt-6 font-display text-xl font-bold">5. Durée de conservation</h2>
          <p>Les données sont conservées pendant la durée d'activité du compte et jusqu'à 3 ans après sa suppression, conformément aux obligations légales.</p>

          <h2 className="mt-6 font-display text-xl font-bold">6. Vos droits</h2>
          <p>Vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition. Pour exercer ces droits, contactez WARAP via la messagerie de l'application avec un administrateur.</p>

          <h2 className="mt-6 font-display text-xl font-bold">7. Cookies</h2>
          <p>WARAP utilise uniquement les cookies strictement nécessaires au fonctionnement (session, authentification). Aucun cookie publicitaire ou de mesure d'audience tiers n'est déposé.</p>

          <h2 className="mt-6 font-display text-xl font-bold">8. Sécurité</h2>
          <p>WARAP met en œuvre des mesures techniques et organisationnelles pour protéger vos données (chiffrement, contrôle d'accès, audits réguliers).</p>

          <h2 className="mt-6 font-display text-xl font-bold">9. Mise à jour de la politique</h2>
          <p>Cette politique peut être mise à jour. Voir aussi les <Link to="/cgu" className="text-primary underline">Conditions Générales d'Utilisation</Link>.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
