# Mise à jour Article 3 des CGU — Fonctionnement des jetons

## Objectif
Rendre l'article 3 plus transparent et préciser que l'usage des jetons est **réciproque (vice-versa)** : aussi bien les clients que les prestataires utilisent des jetons pour interagir sur la plateforme.

## Fichier modifié
- `src/routes/cgu.tsx` — uniquement le bloc de l'article 3.

## Nouveau contenu proposé

**3. Fonctionnement des jetons**

WARAP fonctionne avec un système interne de jetons qui régit toutes les interactions entre clients et prestataires, de manière réciproque (vice-versa) :

- **Pour les clients** : un certain nombre de jetons est requis pour contacter un prestataire (ouverture d'une conversation) et pour publier une offre de mission destinée aux prestataires d'une catégorie donnée.
- **Pour les prestataires** : un certain nombre de jetons est requis pour publier et maintenir leur profil visible sur la plateforme, ainsi que pour postuler ou répondre à une offre publiée par un client.

**Transparence sur les coûts et l'usage :**
- Le coût en jetons de chaque action (contact, publication de profil, publication d'offre, candidature) est affiché clairement avant validation. Aucun débit n'a lieu sans confirmation explicite de l'utilisateur.
- Le solde et l'historique complet des opérations (recharges, débits, motif, date) sont consultables à tout moment depuis le portefeuille de l'utilisateur.
- Les tarifs en jetons peuvent évoluer ; tout changement est communiqué avant son entrée en vigueur et ne s'applique pas rétroactivement aux jetons déjà acquis.

**Acquisition et limites :**
- Les jetons sont acquis via les moyens de recharge proposés sur la plateforme, dans la devise locale (XAF).
- Les jetons sont strictement personnels, non cessibles à un autre compte, **non remboursables** et **non convertibles en monnaie**, sauf obligation légale contraire.
- En cas de suspension ou de fermeture du compte pour manquement aux présentes CGU, les jetons restants peuvent être invalidés sans contrepartie.

## Détails techniques
- Remplacement ciblé du `<h2>` "3. Fonctionnement des jetons" et du `<p>` qui le suit par le nouveau bloc structuré (titre + liste + sous-sections).
- Aucun changement de mise en page globale, de routing, de SEO ou de logique applicative.
- Classes Tailwind cohérentes avec les autres articles (`mt-6 font-display text-xl font-bold`, listes `list-disc pl-5 space-y-1`).
