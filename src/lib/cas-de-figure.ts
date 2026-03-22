/**
 * 20 cas de figure pour tests manuels / recette sur tous les modules (référence unique).
 */
export interface CasDeFigure {
  id: number;
  ecran: string;
  titre: string;
  description: string;
  resultatAttendu: string;
}

export const CAS_DE_FIGURE: CasDeFigure[] = [
  {
    id: 1,
    ecran: 'Dashboard',
    titre: 'Liquidités vs créances',
    description: 'Ouvrir le tableau de bord et vérifier la carte « Trésorerie & hors trésorerie ».',
    resultatAttendu: 'Les montants caisse + banque = sous-total liquidités ; créances = reste factures ; position = somme.',
  },
  {
    id: 2,
    ecran: 'Dashboard',
    titre: 'Indicateurs financiers',
    description: 'Contrôler Revenus, Dépenses, Bénéfice en tête de page.',
    resultatAttendu: 'Cohérence avec factures payées et dépenses enregistrées.',
  },
  {
    id: 3,
    ecran: 'Camions',
    titre: 'Création et statut',
    description: 'Ajouter un camion, le passer actif puis vérifier le compteur sur le dashboard.',
    resultatAttendu: 'Camion listé, statut « actif » reflété dans les stats.',
  },
  {
    id: 4,
    ecran: 'Trajets',
    titre: 'Trajet lié aux camions',
    description: 'Créer un trajet avec tracteur/remorque, date et statut.',
    resultatAttendu: 'Trajet visible, facturation possible depuis Factures.',
  },
  {
    id: 5,
    ecran: 'Factures',
    titre: 'Facture trajet',
    description: 'Générer une facture pour un trajet non encore facturé.',
    resultatAttendu: 'Montant TTC correct ; statut « en attente ».',
  },
  {
    id: 6,
    ecran: 'Factures',
    titre: 'Paiement partiel',
    description: 'Enregistrer un paiement inférieur au TTC.',
    resultatAttendu: 'Statut partiel ; créances dashboard mises à jour.',
  },
  {
    id: 7,
    ecran: 'Factures',
    titre: 'Paiement par virement',
    description: 'Montant > 0, mode « Virement bancaire », choisir un compte, valider.',
    resultatAttendu: 'Écriture « virement » sur le compte choisi (réf. facture:…).',
  },
  {
    id: 8,
    ecran: 'Factures',
    titre: 'Paiement espèces',
    description: 'Même montant avec mode Espèces (sans virement).',
    resultatAttendu: 'Aucune écriture banque supplémentaire pour ce paiement.',
  },
  {
    id: 9,
    ecran: 'Banque',
    titre: 'Dépôt sur compte',
    description: 'Nouvelle transaction type Dépôt, compte choisi, montant positif.',
    resultatAttendu: 'Solde du compte augmente immédiatement du montant du dépôt.',
  },
  {
    id: 10,
    ecran: 'Banque',
    titre: 'Retrait / prélèvement',
    description: 'Transaction débit (retrait) inférieur au solde disponible.',
    resultatAttendu: 'Solde baisse ; refus si montant > disponible.',
  },
  {
    id: 11,
    ecran: 'Banque',
    titre: 'Virement entrant',
    description: 'Type « virement » (crédit) sur un compte.',
    resultatAttendu: 'Solde augmente comme pour un dépôt.',
  },
  {
    id: 12,
    ecran: 'Banque',
    titre: 'Frais bancaires',
    description: 'Type « frais » sur un compte avec solde suffisant.',
    resultatAttendu: 'Solde diminue du montant des frais.',
  },
  {
    id: 13,
    ecran: 'Caisse',
    titre: 'Entrée simple',
    description: 'Entrée de caisse sans prélèvement banque.',
    resultatAttendu: 'Solde caisse augmente ; banque inchangée.',
  },
  {
    id: 14,
    ecran: 'Caisse',
    titre: 'Entrée prélevée sur banque',
    description: 'Entrée avec case cochée et compte bancaire sélectionné.',
    resultatAttendu: 'Retrait banque + entrée caisse ; soldes cohérents.',
  },
  {
    id: 15,
    ecran: 'Caisse',
    titre: 'Bloc liquidités / créances',
    description: 'Vérifier la carte sous les stats (résumé vs dashboard).',
    resultatAttendu: 'Même logique créances + position globale.',
  },
  {
    id: 16,
    ecran: 'Dépenses',
    titre: 'Saisie dépense',
    description: 'Ajouter une dépense avec catégorie et montant.',
    resultatAttendu: 'Visible dans liste et graphiques dashboard si filtrés.',
  },
  {
    id: 17,
    ecran: 'Tiers',
    titre: 'Client / fournisseur',
    description: 'Créer ou modifier un tiers utilisé sur trajets/factures.',
    resultatAttendu: 'Sélection possible dans les écrans concernés.',
  },
  {
    id: 18,
    ecran: 'Chauffeurs',
    titre: 'Fiche chauffeur',
    description: 'Création chauffeur et liaison à un trajet.',
    resultatAttendu: 'Nom affiché sur trajet et exports.',
  },
  {
    id: 19,
    ecran: 'Crédits / Admin',
    titre: 'Droits et sauvegarde',
    description: 'Se connecter en admin : backup JSON ; rôle gestionnaire sans purge.',
    resultatAttendu: 'Backup téléchargé ; actions sensibles réservées admin.',
  },
  {
    id: 20,
    ecran: 'Global',
    titre: 'API indisponible',
    description: 'Arrêter le backend et naviguer.',
    resultatAttendu: 'Bandeau d’erreur API ; données locales banque/caisse toujours utilisables hors sync.',
  },
];
