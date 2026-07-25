import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export function CguPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-3xl font-bold md:text-4xl">Conditions Générales d'Utilisation</h1>
        <p className="mt-2 text-sm text-muted-foreground">Dernière mise à jour : juin 2026</p>

        <div className="prose prose-sm mt-8 max-w-none text-foreground/90">
          <h2 className="mt-8 font-display text-xl font-bold">1. Objet</h2>
          <p>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de la plateforme WARAP, marketplace mettant en relation des clients et des prestataires du secteur du BTP au Cameroun.</p>

          <h2 className="mt-6 font-display text-xl font-bold">2. Inscription et compte utilisateur</h2>
          <p>L'inscription est ouverte à toute personne majeure. L'utilisateur s'engage à fournir des informations exactes. Les prestataires doivent compléter une vérification d'identité (KYC) avant publication de leur profil.</p>

          <h2 className="mt-6 font-display text-xl font-bold">3. Fonctionnement des jetons</h2>
          <p>WARAP fonctionne avec un système interne de jetons qui régit toutes les interactions entre clients et prestataires, de manière réciproque :</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li><strong>Pour les clients</strong> : un certain nombre de jetons est requis pour contacter un prestataire (ouverture d'une conversation) et pour publier une offre de mission destinée aux prestataires d'une catégorie donnée. Les offres publiées expirent automatiquement après 30 jours.</li>
            <li><strong>Pour les prestataires</strong> : un certain nombre de jetons est requis pour publier et maintenir leur profil visible sur la plateforme, ainsi que pour postuler ou répondre à une offre publiée par un client.</li>
          </ul>

          <p className="mt-3 font-semibold">Les coûts et l'usage :</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Le coût en jetons de chaque action (contact, publication de profil, publication d'offre, candidature) est affiché clairement avant validation. Aucun débit n'a lieu sans confirmation explicite de l'utilisateur.</li>
            <li>Le solde et l'historique complet des opérations (recharges, débits, motif, date) sont consultables à tout moment depuis le portefeuille de l'utilisateur.</li>
            <li>Les tarifs en jetons peuvent évoluer ; tout changement est communiqué avant son entrée en vigueur et ne s'applique pas rétroactivement aux jetons déjà acquis.</li>
          </ul>

          <p className="mt-3 font-semibold">Acquisition et limites :</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Les jetons sont acquis via les moyens de recharge proposés sur la plateforme, dans la devise locale (XAF).</li>
            <li>Les jetons sont strictement personnels, non cessibles à un autre compte, <strong>non remboursables</strong> et <strong>non convertibles en monnaie</strong>, sauf obligation légale contraire.</li>
            <li>En cas de suspension ou de fermeture du compte pour manquement aux présentes CGU, les jetons restants peuvent être invalidés sans contrepartie.</li>
          </ul>

          <h2 className="mt-6 font-display text-xl font-bold">4. Publication du profil prestataire</h2>
          <p>Les prestataires paient un montant de jetons défini par la plateforme pour rendre leur profil visible. La publication a une durée limitée renouvelable.</p>

          <h2 className="mt-6 font-display text-xl font-bold">5. Mise en relation</h2>
          <p>WARAP est un intermédiaire technique qui facilite la mise en relation entre clients et prestataires. Les échanges et accords se déroulent ensuite directement entre les utilisateurs concernés.</p>

          <h2 className="mt-6 font-display text-xl font-bold">6. Comportement des utilisateurs</h2>
          <p>Sont interdits : la fraude, l'usurpation d'identité, la publication de contenus illicites, le harcèlement, le contournement du système de jetons. Tout manquement peut entraîner la suspension du compte sans préavis.</p>

          <h2 className="mt-6 font-display text-xl font-bold">7. Propriété intellectuelle</h2>
          <p>La marque WARAP et l'ensemble des éléments de la plateforme sont protégés. Les contenus publiés par les utilisateurs (photos de réalisations, descriptions) restent leur propriété mais une licence d'utilisation est concédée à WARAP pour l'affichage sur la plateforme.</p>

          <h2 className="mt-6 font-display text-xl font-bold">8. Données personnelles</h2>
          <p>Le traitement des données est décrit dans la <Link to="/confidentialite" className="text-primary underline">Politique de confidentialité</Link>.</p>

          <h2 className="mt-6 font-display text-xl font-bold">9. Modification des CGU</h2>
          <p>WARAP se réserve le droit de modifier les présentes CGU. Les utilisateurs seront informés des changements substantiels.</p>

          <h2 className="mt-6 font-display text-xl font-bold">10. Droit applicable</h2>
          <p>Les présentes CGU sont soumises au droit camerounais. Tout litige sera porté devant les tribunaux compétents de Yaoundé.</p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
