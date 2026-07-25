export type Category = {
  id: string;
  name: string;
  icon: string;
  count: number;
};

export const categories: Category[] = [
  { id: "plomberie", name: "Plomberie", icon: "🔧", count: 248 },
  { id: "electricite", name: "Électricité", icon: "⚡", count: 312 },
  { id: "maconnerie", name: "Maçonnerie", icon: "🧱", count: 187 },
  { id: "peinture", name: "Peinture", icon: "🎨", count: 156 },
  { id: "menuiserie", name: "Menuiserie", icon: "🪚", count: 142 },
  { id: "toiture", name: "Toiture", icon: "🏠", count: 98 },
  { id: "carrelage", name: "Carrelage", icon: "🟫", count: 121 },
  { id: "architecture", name: "Architecture", icon: "📐", count: 76 },
  { id: "renovation", name: "Rénovation", icon: "🛠️", count: 203 },
  { id: "climatisation", name: "Climatisation", icon: "❄️", count: 89 },
];

export type Provider = {
  id: string;
  name: string;
  trade: string;
  avatar: string;
  rating: number;
  reviews: number;
  location: string;
  hourlyRate: number;
  available: boolean;
  verified: boolean;
  bio: string;
  skills: string[];
  completedJobs: number;
  responseTime: string;
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ea7c2c,1a1a1a,3b3b3b&textColor=ffffff`;

export const providers: Provider[] = [
  { id: "p1", name: "Mamadou Diallo", trade: "Plombier", avatar: avatar("Mamadou Diallo"), rating: 4.9, reviews: 187, location: "Yaoundé, Centre-ville", hourlyRate: 35, available: true, verified: true, bio: "15 ans d'expérience en installation et dépannage sanitaire. Interventions rapides 7j/7.", skills: ["Dépannage urgent", "Installation sanitaire", "Chauffe-eau", "Détection fuite"], completedJobs: 412, responseTime: "< 1h" },
  { id: "p2", name: "Aïcha Ndiaye", trade: "Architecte", avatar: avatar("Aicha Ndiaye"), rating: 5.0, reviews: 64, location: "Yaoundé, Bastos", hourlyRate: 85, available: true, verified: true, bio: "Architecte DPLG spécialisée habitat moderne, plans 3D et suivi de chantier.", skills: ["Plans 3D", "Permis de construire", "Rénovation", "Bioclimatique"], completedJobs: 92, responseTime: "< 2h" },
  { id: "p3", name: "Ibrahima Sarr", trade: "Électricien", avatar: avatar("Ibrahima Sarr"), rating: 4.8, reviews: 231, location: "Douala, Akwa", hourlyRate: 30, available: false, verified: true, bio: "Électricien certifié, mise aux normes et tableaux électriques.", skills: ["Mise aux normes", "Domotique", "Tableaux", "Éclairage LED"], completedJobs: 508, responseTime: "< 3h" },
  { id: "p4", name: "Fatou Sow", trade: "Peintre", avatar: avatar("Fatou Sow"), rating: 4.7, reviews: 142, location: "Yaoundé, Nlongkak", hourlyRate: 25, available: true, verified: true, bio: "Peinture intérieure & extérieure, finitions soignées, devis gratuit.", skills: ["Intérieur", "Extérieur", "Enduits", "Décoratif"], completedJobs: 276, responseTime: "< 2h" },
  { id: "p5", name: "Ousmane Ba", trade: "Maçon", avatar: avatar("Ousmane Ba"), rating: 4.9, reviews: 98, location: "Yaoundé, Mendong", hourlyRate: 28, available: true, verified: true, bio: "Maçonnerie générale, construction et extension. Équipe de 5 personnes.", skills: ["Gros œuvre", "Extension", "Dalle", "Mur porteur"], completedJobs: 184, responseTime: "< 4h" },
  { id: "p6", name: "Khady Diop", trade: "Carreleur", avatar: avatar("Khady Diop"), rating: 4.6, reviews: 73, location: "Yaoundé, Mvog-Ada", hourlyRate: 27, available: true, verified: false, bio: "Pose carrelage sol et mur, faïence salle de bain, terrasse.", skills: ["Sol", "Mural", "Faïence", "Terrasse"], completedJobs: 138, responseTime: "< 6h" },
  { id: "p7", name: "Moussa Fall", trade: "Menuisier", avatar: avatar("Moussa Fall"), rating: 4.8, reviews: 116, location: "Yaoundé, Essos", hourlyRate: 32, available: true, verified: true, bio: "Menuiserie bois et alu, fenêtres, portes, dressing sur mesure.", skills: ["Sur mesure", "Alu", "Bois", "Cuisine"], completedJobs: 219, responseTime: "< 3h" },
  { id: "p8", name: "Aminata Cissé", trade: "Ingénieur BTP", avatar: avatar("Aminata Cisse"), rating: 5.0, reviews: 41, location: "Yaoundé, Centre-ville", hourlyRate: 95, available: true, verified: true, bio: "Ingénieure structure, suivi technique et études béton armé.", skills: ["Études", "Béton armé", "Suivi", "BIM"], completedJobs: 58, responseTime: "< 1h" },
];

export const portfolio = [
  { title: "Villa moderne — Almadies", img: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" },
  { title: "Rénovation cuisine", img: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80" },
  { title: "Salle de bain premium", img: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80" },
  { title: "Extension R+1", img: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=600&q=80" },
];

export const reviews = [
  { id: "r1", author: "Sokhna M.", rating: 5, date: "Il y a 2 j", text: "Travail impeccable, ponctuel et propre. Je recommande à 100%." },
  { id: "r2", author: "Cheikh D.", rating: 5, date: "Il y a 1 sem", text: "Prestataire très professionnel, devis clair et respecté." },
  { id: "r3", author: "Marie N.", rating: 4, date: "Il y a 2 sem", text: "Bon rapport qualité-prix, intervention rapide." },
];

export const projects = [
  { id: "j1", title: "Rénovation appartement 3 pièces", status: "En cours", budget: "1 200 000 FCFA", provider: "Mamadou Diallo", deadline: "12 juin" },
  { id: "j2", title: "Installation climatisation bureau", status: "Devis reçu", budget: "450 000 FCFA", provider: "Ibrahima Sarr", deadline: "20 juin" },
  { id: "j3", title: "Peinture façade villa", status: "Terminé", budget: "780 000 FCFA", provider: "Fatou Sow", deadline: "—" },
];

export const conversations = [
  { id: "c1", name: "Mamadou Diallo", trade: "Plombier", last: "Je passe demain à 9h pour le devis.", time: "10:24", unread: 2, online: true },
  { id: "c2", name: "Aïcha Ndiaye", trade: "Architecte", last: "Voici les plans révisés en PJ.", time: "Hier", unread: 0, online: false },
  { id: "c3", name: "Fatou Sow", trade: "Peintre", last: "Parfait, on commence lundi.", time: "Lun", unread: 0, online: true },
  { id: "c4", name: "Moussa Fall", trade: "Menuisier", last: "Je vous envoie les références.", time: "12 mai", unread: 0, online: false },
];

export const messagesThread = [
  { from: "them", text: "Bonjour, j'ai bien reçu votre demande pour la fuite sous évier.", time: "10:18" },
  { from: "me", text: "Bonjour ! Oui, c'est assez urgent. Vous êtes disponible aujourd'hui ?", time: "10:20" },
  { from: "them", text: "Je peux passer demain à 9h pour un diagnostic gratuit. Ça vous va ?", time: "10:24" },
];

export const notifications = [
  { id: "n1", text: "Nouveau devis reçu de Ibrahima Sarr", time: "Il y a 5 min", unread: true },
  { id: "n2", text: "Mamadou Diallo a accepté votre demande", time: "Il y a 2h", unread: true },
  { id: "n3", text: "Avis publié sur votre projet", time: "Hier", unread: false },
];

export const stats = {
  providers: "3 240",
  jobs: "12 800",
  cities: "48",
  satisfaction: "98%",
};

export const adminUsers = [
  { id: "u1", name: "Sokhna Mbaye", role: "Client", joined: "12 mai 2026", status: "Actif" },
  { id: "u2", name: "Mamadou Diallo", role: "Prestataire", joined: "03 jan 2025", status: "Vérifié" },
  { id: "u3", name: "Khady Diop", role: "Prestataire", joined: "22 mar 2026", status: "En attente" },
  { id: "u4", name: "Cheikh Dieng", role: "Client", joined: "08 mai 2026", status: "Actif" },
  { id: "u5", name: "Aïcha Ndiaye", role: "Prestataire", joined: "14 fév 2025", status: "Vérifié" },
];

export const reports = [
  { id: "rp1", target: "Profil prestataire #p6", reason: "Informations inexactes", date: "Aujourd'hui", severity: "Faible" },
  { id: "rp2", target: "Message dans conv #c2", reason: "Spam suspecté", date: "Hier", severity: "Moyenne" },
];

export const providerServices = [
  { id: "s1", title: "Dépannage urgent 24/7", price: "à partir de 15 000 FCFA", desc: "Intervention rapide pour fuite, panne ou urgence sanitaire." },
  { id: "s2", title: "Installation chauffe-eau", price: "45 000 FCFA", desc: "Pose complète avec garantie 2 ans, marques certifiées." },
  { id: "s3", title: "Mise aux normes plomberie", price: "Sur devis", desc: "Diagnostic complet et remise aux normes de l'installation." },
  { id: "s4", title: "Rénovation salle de bain", price: "à partir de 350 000 FCFA", desc: "Plomberie complète, faïence et raccordements sanitaires." },
  { id: "s5", title: "Entretien annuel", price: "25 000 FCFA / an", desc: "Visite préventive, détartrage et contrôle des installations." },
];

export const providerMissions = [
  { id: "m1", client: "Sokhna Mbaye", title: "Fuite sous évier — urgent", status: "En cours", budget: "30 000 FCFA", date: "Aujourd'hui" },
  { id: "m2", client: "Cheikh Dieng", title: "Installation chauffe-eau 200L", status: "Acceptée", budget: "85 000 FCFA", date: "Demain" },
  { id: "m3", client: "Marie Ndour", title: "Rénovation salle de bain", status: "En attente", budget: "1 200 000 FCFA", date: "15 juin" },
  { id: "m4", client: "Pape Sow", title: "Diagnostic plomberie villa", status: "Terminée", budget: "20 000 FCFA", date: "10 mai" },
  { id: "m5", client: "Awa Diouf", title: "Remplacement robinetterie", status: "Terminée", budget: "55 000 FCFA", date: "02 mai" },
];

export const allReviews = [
  { id: "ar1", author: "Sokhna M.", rating: 5, date: "Il y a 2 j", text: "Travail impeccable, ponctuel et propre. Je recommande à 100%." },
  { id: "ar2", author: "Cheikh D.", rating: 5, date: "Il y a 1 sem", text: "Prestataire très professionnel, devis clair et respecté." },
  { id: "ar3", author: "Marie N.", rating: 4, date: "Il y a 2 sem", text: "Bon rapport qualité-prix, intervention rapide." },
  { id: "ar4", author: "Pape S.", rating: 5, date: "Il y a 3 sem", text: "Très satisfait, équipe sérieuse et compétente." },
  { id: "ar5", author: "Awa D.", rating: 4, date: "Il y a 1 mois", text: "Bonne prestation, communication efficace." },
  { id: "ar6", author: "Ousmane B.", rating: 5, date: "Il y a 1 mois", text: "Chantier livré dans les délais. Parfait." },
  { id: "ar7", author: "Fatima L.", rating: 5, date: "Il y a 2 mois", text: "Excellent, je rappellerai pour d'autres travaux." },
  { id: "ar8", author: "Mor T.", rating: 4, date: "Il y a 2 mois", text: "Bon professionnel, devis tenu." },
  { id: "ar9", author: "Khady G.", rating: 5, date: "Il y a 3 mois", text: "Très propre, finitions soignées." },
  { id: "ar10", author: "Ibrahima K.", rating: 5, date: "Il y a 3 mois", text: "Rien à redire, travail de qualité." },
];

