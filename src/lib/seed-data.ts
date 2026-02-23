/**
 * Données de démonstration - 10 cas par écran
 * Dates, valeurs et chauffeurs variés
 */

import {
  trucksApi,
  driversApi,
  tripsApi,
  expensesApi,
  invoicesApi,
  thirdPartiesApi,
  adminApi,
} from './api';

// --- TIERS (10 cas) ---
const TIERS_SEED = [
  { nom: 'Jean Mbarga', telephone: '+237 690 12 34 56', type: 'proprietaire' as const, adresse: 'Douala, Akwa' },
  { nom: 'Marie Ngo', telephone: '+237 691 23 45 67', type: 'client' as const, adresse: 'Yaoundé, Bastos' },
  { nom: 'Total Cameroun', telephone: '+237 233 40 00 00', type: 'fournisseur' as const, adresse: 'Douala, Bonabéri' },
  { nom: 'Pierre Essono', telephone: '+237 692 34 56 78', type: 'proprietaire' as const },
  { nom: 'Socopa SA', telephone: '+237 222 21 00 00', type: 'client' as const, adresse: 'Douala' },
  { nom: 'Garage Central', telephone: '+237 233 41 11 11', type: 'fournisseur' as const },
  { nom: 'Anne Fotso', telephone: '+237 693 45 67 89', type: 'proprietaire' as const },
  { nom: 'Bolloré Transport', telephone: '+237 233 50 20 20', type: 'client' as const },
  { nom: 'Assurances AXA', telephone: '+237 233 42 00 00', type: 'fournisseur' as const },
  { nom: 'Paul Tchakounte', telephone: '+237 694 56 78 90', type: 'client' as const },
];

// --- CHAUFFEURS (10 cas) ---
const DRIVERS_SEED = [
  { nom: 'Moukoko', prenom: 'Samuel', telephone: '+237 670 11 22 33', cni: '1234567890123' },
  { nom: 'Abega', prenom: 'Roger', telephone: '+237 671 22 33 44', cni: '1234567890124' },
  { nom: 'Nkoulou', prenom: 'Aurélien', telephone: '+237 672 33 44 55', cni: '1234567890125' },
  { nom: 'Onguene', prenom: 'Eric', telephone: '+237 673 44 55 66', cni: '1234567890126' },
  { nom: 'Toko', prenom: 'Patrick', telephone: '+237 674 55 66 77', cni: '1234567890127' },
  { nom: 'Kunde', prenom: 'Joseph', telephone: '+237 675 66 77 88', cni: '1234567890128' },
  { nom: 'Milla', prenom: 'Roger', telephone: '+237 676 77 88 99', cni: '1234567890129' },
  { nom: 'Song', prenom: 'Alexandre', telephone: '+237 677 88 99 00', cni: '1234567890130' },
  { nom: 'Eto\'o', prenom: 'Samuel', telephone: '+237 678 99 00 11', cni: '1234567890131' },
  { nom: 'Mbia', prenom: 'Stéphane', telephone: '+237 679 00 11 22', cni: '1234567890132' },
];

// --- CAMIONS (10 cas) ---
const getTrucksSeed = (proprietaireIds: string[]) => [
  { immatriculation: 'LT-1234-AB', modele: 'Volvo FH16', type: 'tracteur' as const, statut: 'actif' as const, dateMiseEnCirculation: '2020-03-15', proprietaireId: proprietaireIds[0] },
  { immatriculation: 'LT-5678-CD', modele: 'Scania R500', type: 'tracteur' as const, statut: 'actif' as const, dateMiseEnCirculation: '2019-07-22', proprietaireId: proprietaireIds[0] },
  { immatriculation: 'LT-9012-EF', modele: 'MAN TGX', type: 'tracteur' as const, statut: 'actif' as const, dateMiseEnCirculation: '2021-01-10', proprietaireId: proprietaireIds[1] },
  { immatriculation: 'LT-3456-GH', modele: 'DAF XF', type: 'tracteur' as const, statut: 'inactif' as const, dateMiseEnCirculation: '2018-11-05', proprietaireId: proprietaireIds[1] },
  { immatriculation: 'LT-7890-IJ', modele: 'Iveco Stralis', type: 'tracteur' as const, statut: 'actif' as const, dateMiseEnCirculation: '2022-05-18', proprietaireId: proprietaireIds[2] },
  { immatriculation: 'LR-1111-KL', modele: 'Remorque 40 pieds', type: 'remorqueuse' as const, statut: 'actif' as const, dateMiseEnCirculation: '2019-02-28' },
  { immatriculation: 'LR-2222-MN', modele: 'Remorque frigorifique', type: 'remorqueuse' as const, statut: 'actif' as const, dateMiseEnCirculation: '2020-09-12' },
  { immatriculation: 'LT-3333-OP', modele: 'Mercedes Actros', type: 'tracteur' as const, statut: 'actif' as const, dateMiseEnCirculation: '2021-08-30', proprietaireId: proprietaireIds[2] },
  { immatriculation: 'LT-4444-QR', modele: 'Renault T High', type: 'tracteur' as const, statut: 'actif' as const, dateMiseEnCirculation: '2023-02-14', proprietaireId: proprietaireIds[0] },
  { immatriculation: 'LR-5555-ST', modele: 'Citerne 30m³', type: 'remorqueuse' as const, statut: 'actif' as const, dateMiseEnCirculation: '2020-06-20' },
];

// --- TRAJETS (10 cas) - dates variées, différents chauffeurs ---
const getTripsSeed = (chauffeurIds: string[], tracteurIds: string[], remorqueIds: string[], clientIds: string[]) => [
  { origine: 'Douala', destination: 'Yaoundé', chauffeurId: chauffeurIds[0], tracteurId: tracteurIds[0], remorqueuseId: remorqueIds[0], dateDepart: '2024-11-05', dateArrivee: '2024-11-05', recette: 450000, prefinancement: 100000, client: 'Marie Ngo', marchandise: 'Électronique', statut: 'termine' as const },
  { origine: 'Yaoundé', destination: 'Garoua', chauffeurId: chauffeurIds[1], tracteurId: tracteurIds[1], dateDepart: '2024-12-10', dateArrivee: '2024-12-12', recette: 1200000, client: 'Socopa SA', marchandise: 'Ciment', statut: 'termine' as const },
  { origine: 'Douala', destination: 'Ngaoundéré', chauffeurId: chauffeurIds[2], tracteurId: tracteurIds[2], remorqueuseId: remorqueIds[1], dateDepart: '2025-01-15', dateArrivee: '2025-01-17', recette: 950000, prefinancement: 200000, client: 'Bolloré Transport', statut: 'en_cours' as const },
  { origine: 'Bafoussam', destination: 'Douala', chauffeurId: chauffeurIds[3], tracteurId: tracteurIds[3], dateDepart: '2025-02-01', dateArrivee: '2025-02-02', recette: 380000, marchandise: 'Café', statut: 'planifie' as const },
  { origine: 'Maroua', destination: 'Douala', chauffeurId: chauffeurIds[4], tracteurId: tracteurIds[4], dateDepart: '2024-10-20', dateArrivee: '2024-10-23', recette: 1800000, client: 'Paul Tchakounte', statut: 'termine' as const },
  { origine: 'Ebolowa', destination: 'Yaoundé', chauffeurId: chauffeurIds[5], tracteurId: tracteurIds[0], dateDepart: '2025-01-28', dateArrivee: '2025-01-29', recette: 280000, statut: 'planifie' as const },
  { origine: 'Douala', destination: 'Bamenda', chauffeurId: chauffeurIds[6], tracteurId: tracteurIds[1], remorqueuseId: remorqueIds[0], dateDepart: '2024-09-12', dateArrivee: '2024-09-13', recette: 520000, prefinancement: 150000, client: 'Marie Ngo', statut: 'termine' as const },
  { origine: 'Kribi', destination: 'Douala', chauffeurId: chauffeurIds[7], tracteurId: tracteurIds[2], dateDepart: '2025-02-10', dateArrivee: '2025-02-11', recette: 320000, marchandise: 'Bois', statut: 'planifie' as const },
  { origine: 'Bertoua', destination: 'Yaoundé', chauffeurId: chauffeurIds[8], tracteurId: tracteurIds[3], dateDepart: '2024-11-25', dateArrivee: '2024-11-26', recette: 410000, statut: 'termine' as const },
  { origine: 'Limbe', destination: 'Bafoussam', chauffeurId: chauffeurIds[9], tracteurId: tracteurIds[4], remorqueuseId: remorqueIds[1], dateDepart: '2025-02-15', dateArrivee: '2025-02-16', recette: 480000, client: 'Socopa SA', statut: 'planifie' as const },
];

// --- DÉPENSES (10 cas) ---
const getExpensesSeed = (camionIds: string[], tripIds: string[], chauffeurIds: string[], fournisseurIds: string[]) => [
  { camionId: camionIds[0], tripId: tripIds[0], chauffeurId: chauffeurIds[0], categorie: 'Carburant', sousCategorie: 'Diesel', montant: 85000, quantite: 200, prixUnitaire: 425, date: '2024-11-05', description: 'Plein Douala', fournisseurId: fournisseurIds[0] },
  { camionId: camionIds[1], tripId: tripIds[1], chauffeurId: chauffeurIds[1], categorie: 'Péage', sousCategorie: 'Autoroute', montant: 25000, date: '2024-12-10', description: 'Péage Yaoundé-Garoua', fournisseurId: fournisseurIds[1] },
  { camionId: camionIds[2], tripId: tripIds[2], chauffeurId: chauffeurIds[2], categorie: 'Maintenance', sousCategorie: 'Révision', montant: 150000, date: '2025-01-14', description: 'Révision 100 000 km', fournisseurId: fournisseurIds[1] },
  { camionId: camionIds[0], categorie: 'Assurance', sousCategorie: 'Assurance véhicule', montant: 320000, date: '2025-01-01', description: 'Assurance annuelle LT-1234', fournisseurId: fournisseurIds[2] },
  { camionId: camionIds[3], tripId: tripIds[3], chauffeurId: chauffeurIds[3], categorie: 'Carburant', sousCategorie: 'Diesel', montant: 62000, quantite: 150, date: '2025-02-01', description: 'Plein Bafoussam', fournisseurId: fournisseurIds[0] },
  { camionId: camionIds[1], tripId: tripIds[4], chauffeurId: chauffeurIds[4], categorie: 'Péage', montant: 45000, date: '2024-10-21', description: 'Péages Maroua-Douala', fournisseurId: fournisseurIds[1] },
  { camionId: camionIds[2], categorie: 'Maintenance', sousCategorie: 'Pièces détachées', montant: 95000, date: '2024-12-20', description: 'Freins avant', fournisseurId: fournisseurIds[1] },
  { camionId: camionIds[4], tripId: tripIds[5], chauffeurId: chauffeurIds[5], categorie: 'Carburant', sousCategorie: 'Diesel', montant: 48000, date: '2025-01-28', description: 'Plein Ebolowa', fournisseurId: fournisseurIds[0] },
  { camionId: camionIds[0], tripId: tripIds[6], chauffeurId: chauffeurIds[6], categorie: 'Péage', montant: 18000, date: '2024-09-12', description: 'Péage Douala-Bamenda', fournisseurId: fournisseurIds[1] },
  { camionId: camionIds[3], categorie: 'Maintenance', sousCategorie: 'Vidange', montant: 45000, date: '2025-02-05', description: 'Vidange moteur', fournisseurId: fournisseurIds[1] },
];

// --- FACTURES (10 cas) ---
const getInvoicesSeed = (tripIds: string[]) => [
  { numero: 'FAC-2024-001', trajetId: tripIds[0], statut: 'payee' as const, montantHT: 409091, tva: 40909, montantTTC: 450000, montantPaye: 450000, dateCreation: '2024-11-06', datePaiement: '2024-11-08', modePaiement: 'Virement' },
  { numero: 'FAC-2024-002', trajetId: tripIds[1], statut: 'payee' as const, montantHT: 1090909, tva: 109091, montantTTC: 1200000, montantPaye: 1200000, dateCreation: '2024-12-13', datePaiement: '2024-12-15', modePaiement: 'Chèque' },
  { numero: 'FAC-2025-003', trajetId: tripIds[2], statut: 'en_attente' as const, montantHT: 863636, tva: 86364, montantTTC: 950000, dateCreation: '2025-01-16' },
  { numero: 'FAC-2025-004', trajetId: tripIds[3], statut: 'en_attente' as const, montantHT: 345455, tva: 34545, montantTTC: 380000, dateCreation: '2025-02-02' },
  { numero: 'FAC-2024-005', trajetId: tripIds[4], statut: 'payee' as const, montantHT: 1636364, tva: 163636, montantTTC: 1800000, montantPaye: 900000, dateCreation: '2024-10-24', datePaiement: '2024-10-25', modePaiement: 'Espèces' },
  { numero: 'FAC-2025-006', trajetId: tripIds[5], statut: 'en_attente' as const, montantHT: 254545, tva: 25455, montantTTC: 280000, dateCreation: '2025-01-29' },
  { numero: 'FAC-2024-007', trajetId: tripIds[6], statut: 'payee' as const, montantHT: 472727, tva: 47273, montantTTC: 520000, montantPaye: 520000, dateCreation: '2024-09-14', datePaiement: '2024-09-14', modePaiement: 'Virement' },
  { numero: 'FAC-2025-008', trajetId: tripIds[7], statut: 'en_attente' as const, montantHT: 290909, tva: 29091, montantTTC: 320000, dateCreation: '2025-02-11' },
  { numero: 'FAC-2024-009', trajetId: tripIds[8], statut: 'payee' as const, montantHT: 372727, tva: 37273, montantTTC: 410000, montantPaye: 410000, dateCreation: '2024-11-27', datePaiement: '2024-11-28', modePaiement: 'Espèces' },
  { numero: 'FAC-2025-010', trajetId: tripIds[9], statut: 'en_attente' as const, montantHT: 436364, tva: 43636, montantTTC: 480000, dateCreation: '2025-02-16' },
];

// --- BANQUE (localStorage) - 10 transactions + 2 comptes ---
const BANK_ACCOUNTS_SEED = [
  { id: 'bank-1', nom: 'Compte Principal', numeroCompte: 'CM0012345678', banque: 'BICEC', type: 'courant' as const, soldeInitial: 5000000, soldeActuel: 5000000, devise: 'FCFA', iban: 'CM21 0012 3456 7890 1234 5678 90' },
  { id: 'bank-2', nom: 'Compte Épargne', numeroCompte: 'CM0098765432', banque: 'Afriland', type: 'epargne' as const, soldeInitial: 2000000, soldeActuel: 2000000, devise: 'FCFA' },
];

const BANK_TRANSACTIONS_SEED = [
  { id: 'bt-1', compteId: 'bank-1', type: 'depot' as const, montant: 450000, date: '2024-11-08', description: 'Paiement trajet Douala-Yaoundé', reference: 'FAC-2024-001', beneficiaire: 'Marie Ngo' },
  { id: 'bt-2', compteId: 'bank-1', type: 'retrait' as const, montant: 85000, date: '2024-11-05', description: 'Carburant', reference: 'CARB-001', beneficiaire: 'Total Cameroun' },
  { id: 'bt-3', compteId: 'bank-1', type: 'depot' as const, montant: 1200000, date: '2024-12-15', description: 'Paiement Socopa', reference: 'FAC-2024-002', beneficiaire: 'Socopa SA' },
  { id: 'bt-4', compteId: 'bank-1', type: 'retrait' as const, montant: 150000, date: '2025-01-14', description: 'Révision véhicule', reference: 'MAINT-001', beneficiaire: 'Garage Central' },
  { id: 'bt-5', compteId: 'bank-1', type: 'virement' as const, montant: 500000, date: '2025-01-20', description: 'Virement vers épargne', reference: 'VIR-001' },
  { id: 'bt-6', compteId: 'bank-2', type: 'depot' as const, montant: 500000, date: '2025-01-20', description: 'Virement depuis principal', reference: 'VIR-001' },
  { id: 'bt-7', compteId: 'bank-1', type: 'retrait' as const, montant: 320000, date: '2025-01-01', description: 'Assurance annuelle', reference: 'ASS-001', beneficiaire: 'AXA' },
  { id: 'bt-8', compteId: 'bank-1', type: 'depot' as const, montant: 520000, date: '2024-09-14', description: 'Paiement Marie Ngo', reference: 'FAC-2024-007', beneficiaire: 'Marie Ngo' },
  { id: 'bt-9', compteId: 'bank-1', type: 'frais' as const, montant: 5000, date: '2024-12-01', description: 'Frais de tenue de compte', reference: 'FRAIS-001' },
  { id: 'bt-10', compteId: 'bank-1', type: 'depot' as const, montant: 410000, date: '2024-11-28', description: 'Paiement trajet Bertoua-Yaoundé', reference: 'FAC-2024-009', beneficiaire: 'Client' },
];

// --- CRÉDITS (localStorage) - 10 cas ---
const CREDITS_SEED = [
  {
    id: 'cred-1', type: 'emprunt', intitule: 'Prêt achat Volvo FH16', preteur: 'BICEC',
    montantTotal: 15000000, montantRembourse: 6000000, tauxInteret: 8.5,
    dateDebut: '2023-03-01', dateEcheance: '2026-03-01', statut: 'en_cours',
    notes: 'Prêt sur 36 mois pour achat tracteur',
    remboursements: [
      { id: 'r1-1', date: '2023-04-01', montant: 500000, note: 'Mensualité avril 2023' },
      { id: 'r1-2', date: '2023-07-01', montant: 500000, note: 'Mensualité juillet' },
      { id: 'r1-3', date: '2024-01-01', montant: 2000000, note: 'Remboursement anticipé' },
      { id: 'r1-4', date: '2024-06-01', montant: 3000000, note: 'Remboursement partiel' },
    ]
  },
  {
    id: 'cred-2', type: 'emprunt', intitule: 'Prêt équipement remorques', preteur: 'Afriland First Bank',
    montantTotal: 8000000, montantRembourse: 8000000, tauxInteret: 7.5,
    dateDebut: '2022-06-15', dateEcheance: '2024-06-15', statut: 'solde',
    notes: 'Entièrement remboursé',
    remboursements: [
      { id: 'r2-1', date: '2023-06-15', montant: 4000000, note: 'Mi-parcours' },
      { id: 'r2-2', date: '2024-06-15', montant: 4000000, note: 'Solde final' },
    ]
  },
  {
    id: 'cred-3', type: 'pret_accorde', intitule: 'Avance chauffeur Moukoko', preteur: 'Samuel Moukoko',
    montantTotal: 250000, montantRembourse: 100000, tauxInteret: 0,
    dateDebut: '2025-01-10', dateEcheance: '2025-04-10', statut: 'en_cours',
    notes: 'Avance sur salaire à déduire mensuel',
    remboursements: [
      { id: 'r3-1', date: '2025-02-01', montant: 50000, note: 'Déduction janvier' },
      { id: 'r3-2', date: '2025-03-01', montant: 50000, note: 'Déduction février' },
    ]
  },
  {
    id: 'cred-4', type: 'emprunt', intitule: 'Ligne de crédit carburant', preteur: 'Total Cameroun',
    montantTotal: 3000000, montantRembourse: 500000, tauxInteret: 0,
    dateDebut: '2025-01-01', dateEcheance: '2025-06-30', statut: 'en_cours',
    notes: 'Crédit fournisseur 90 jours',
    remboursements: [
      { id: 'r4-1', date: '2025-02-15', montant: 500000, note: 'Paiement partiel' },
    ]
  },
  {
    id: 'cred-5', type: 'pret_accorde', intitule: 'Prêt à Jean Mbarga', preteur: 'Jean Mbarga',
    montantTotal: 1500000, montantRembourse: 750000, tauxInteret: 5,
    dateDebut: '2024-09-01', dateEcheance: '2025-03-01', statut: 'en_retard',
    notes: 'Prêt personnel au propriétaire partenaire',
    remboursements: [
      { id: 'r5-1', date: '2024-10-01', montant: 250000, note: 'Mensualité octobre' },
      { id: 'r5-2', date: '2024-11-01', montant: 250000, note: 'Mensualité novembre' },
      { id: 'r5-3', date: '2024-12-01', montant: 250000, note: 'Mensualité décembre' },
    ]
  },
  {
    id: 'cred-6', type: 'emprunt', intitule: 'Prêt réparation moteur LT-3456', preteur: 'Pierre Essono',
    montantTotal: 600000, montantRembourse: 600000, tauxInteret: 0,
    dateDebut: '2024-05-01', dateEcheance: '2024-11-01', statut: 'solde',
    notes: 'Avance du propriétaire remboursée',
    remboursements: [
      { id: 'r6-1', date: '2024-08-01', montant: 300000, note: 'Mi-paiement' },
      { id: 'r6-2', date: '2024-11-01', montant: 300000, note: 'Solde' },
    ]
  },
  {
    id: 'cred-7', type: 'pret_accorde', intitule: 'Avance client Socopa SA', preteur: 'Socopa SA',
    montantTotal: 500000, montantRembourse: 500000, tauxInteret: 0,
    dateDebut: '2024-08-01', dateEcheance: '2024-12-31', statut: 'solde',
    notes: 'Acompte déduit sur facture FAC-2024-002',
    remboursements: [
      { id: 'r7-1', date: '2024-12-15', montant: 500000, note: 'Déduit facture 2024-002' },
    ]
  },
  {
    id: 'cred-8', type: 'emprunt', intitule: 'Financement renouvellement flotte', preteur: 'SCB Cameroun',
    montantTotal: 25000000, montantRembourse: 2500000, tauxInteret: 9,
    dateDebut: '2025-01-15', dateEcheance: '2028-01-15', statut: 'en_cours',
    notes: 'Financement 3 nouveaux tracteurs',
    remboursements: [
      { id: 'r8-1', date: '2025-02-15', montant: 2500000, note: 'Première mensualité' },
    ]
  },
  {
    id: 'cred-9', type: 'pret_accorde', intitule: 'Prêt chauffeur Abega Roger', preteur: 'Roger Abega',
    montantTotal: 180000, montantRembourse: 60000, tauxInteret: 0,
    dateDebut: '2025-02-01', dateEcheance: '2025-05-01', statut: 'en_cours',
    notes: 'Urgence médicale — à déduire salaire',
    remboursements: [
      { id: 'r9-1', date: '2025-03-01', montant: 60000, note: 'Déduction mars' },
    ]
  },
  {
    id: 'cred-10', type: 'emprunt', intitule: 'Assurance flotte annuelle', preteur: 'AXA Cameroun',
    montantTotal: 1200000, montantRembourse: 400000, tauxInteret: 0,
    dateDebut: '2025-01-01', dateEcheance: '2025-12-31', statut: 'en_cours',
    notes: 'Paiement trimestriel assurance 10 véhicules',
    remboursements: [
      { id: 'r10-1', date: '2025-01-01', montant: 400000, note: 'Trimestre 1' },
    ]
  },
];

// --- CAISSE (localStorage) - 10 transactions ---
const CAISSE_TRANSACTIONS_SEED = [
  { id: 'caisse-1', type: 'entree' as const, montant: 150000, date: '2024-11-08', description: 'Paiement espèces trajet', reference: 'TRJ-001', categorie: 'Recettes trajets' },
  { id: 'caisse-2', type: 'sortie' as const, montant: 25000, date: '2024-11-10', description: 'Frais chauffeur', reference: 'CHF-001', categorie: 'Frais personnel' },
  { id: 'caisse-3', type: 'entree' as const, montant: 200000, date: '2024-12-15', description: 'Acompte client', reference: 'ACP-001', categorie: 'Acomptes' },
  { id: 'caisse-4', type: 'sortie' as const, montant: 45000, date: '2024-12-20', description: 'Vidange', reference: 'MAINT-001', categorie: 'Maintenance' },
  { id: 'caisse-5', type: 'entree' as const, montant: 380000, date: '2025-01-05', description: 'Paiement trajet Bafoussam', reference: 'TRJ-002', categorie: 'Recettes trajets' },
  { id: 'caisse-6', type: 'sortie' as const, montant: 15000, date: '2025-01-12', description: 'Péage', reference: 'PEG-001', categorie: 'Péage' },
  { id: 'caisse-7', type: 'entree' as const, montant: 95000, date: '2025-01-25', description: 'Remboursement chauffeur', reference: 'RMB-001', categorie: 'Divers' },
  { id: 'caisse-8', type: 'sortie' as const, montant: 80000, date: '2025-02-01', description: 'Carburant caisse', reference: 'CARB-002', categorie: 'Carburant' },
  { id: 'caisse-9', type: 'entree' as const, montant: 280000, date: '2025-02-10', description: 'Paiement espèces facture', reference: 'FAC-006', categorie: 'Recettes factures' },
  { id: 'caisse-10', type: 'sortie' as const, montant: 35000, date: '2025-02-14', description: 'Frais divers', reference: 'DIV-001', categorie: 'Divers' },
];

/**
 * Exécute le seed complet.
 * - API: ThirdParties → Drivers → Trucks → Trips → Expenses → Invoices
 * - localStorage: Bank, Caisse
 */
export async function runSeed(refreshCallbacks?: {
  refreshTrucks?: () => Promise<void>;
  refreshDrivers?: () => Promise<void>;
  refreshTrips?: () => Promise<void>;
  refreshExpenses?: () => Promise<void>;
  refreshInvoices?: () => Promise<void>;
  refreshThirdParties?: () => Promise<void>;
}): Promise<{ success: string[]; errors: string[] }> {
  const success: string[] = [];
  const errors: string[] = [];

  // 0. Purge base de données + localStorage
  try {
    await adminApi.purge();
    localStorage.removeItem('bank_accounts');
    localStorage.removeItem('bank_transactions');
    localStorage.removeItem('caisse_transactions');
    localStorage.removeItem('caisse_solde_initial');
    localStorage.removeItem('credits_data');
    success.push('Purge base de données');
  } catch (e) {
    errors.push(`Purge: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // 1. Tiers
  try {
    for (const t of TIERS_SEED) {
      await thirdPartiesApi.create(t);
    }
    success.push('Tiers (10)');
  } catch (e) {
    errors.push(`Tiers: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // 2. Chauffeurs
  try {
    for (const d of DRIVERS_SEED) {
      await driversApi.create(d);
    }
    success.push('Chauffeurs (10)');
  } catch (e) {
    errors.push(`Chauffeurs: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // Récupérer les IDs créés
  let thirdParties: { id: string; type: string }[] = [];
  let drivers: { id: string }[] = [];
  let trucks: { id: string; type: string }[] = [];
  let trips: { id: string }[] = [];

  try {
    thirdParties = await thirdPartiesApi.getAll();
    drivers = await driversApi.getAll();
  } catch {
    // Continue sans IDs si API échoue
  }

  const proprietaireIds = thirdParties.filter((t: any) => t.type === 'proprietaire').map((t: any) => t.id);
  const fournisseurIds = thirdParties.filter((t: any) => t.type === 'fournisseur').map((t: any) => t.id);
  const chauffeurIds = drivers.map((d: any) => d.id);

  // 3. Camions
  try {
    const trucksSeed = getTrucksSeed(proprietaireIds.length >= 3 ? proprietaireIds : ['', '', '']);
    for (const t of trucksSeed) {
      const payload = { ...t };
      if (!payload.proprietaireId) delete payload.proprietaireId;
      await trucksApi.create(payload);
    }
    trucks = await trucksApi.getAll();
  } catch (e) {
    errors.push(`Camions: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  const tracteurIds = trucks.filter((t: any) => t.type === 'tracteur').map((t: any) => t.id);
  const remorqueIds = trucks.filter((t: any) => t.type === 'remorqueuse').map((t: any) => t.id);
  const camionIds = tracteurIds.length ? tracteurIds : trucks.map((t: any) => t.id);
  const clientIds = thirdParties.filter((t: any) => t.type === 'client').map((t: any) => t.id);

  // 4. Trajets
  try {
    const tripsSeed = getTripsSeed(
      chauffeurIds.length >= 10 ? chauffeurIds : Array(10).fill(chauffeurIds[0] || ''),
      tracteurIds.length >= 5 ? tracteurIds : Array(10).fill(tracteurIds[0] || ''),
      remorqueIds.length >= 2 ? remorqueIds : [],
      clientIds
    );
    for (const t of tripsSeed) {
      const payload: any = { ...t };
      if (!payload.remorqueuseId) delete payload.remorqueuseId;
      if (!payload.client) delete payload.client;
      if (!payload.marchandise) delete payload.marchandise;
      if (!payload.prefinancement) delete payload.prefinancement;
      await tripsApi.create(payload);
    }
    trips = await tripsApi.getAll();
  } catch (e) {
    errors.push(`Trajets: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  const tripIds = trips.map((t: any) => t.id);

  // 5. Dépenses
  try {
    const expensesSeed = getExpensesSeed(
      camionIds.length >= 5 ? camionIds : Array(10).fill(camionIds[0] || ''),
      tripIds.length >= 9 ? tripIds : Array(10).fill(tripIds[0] || ''),
      chauffeurIds.length >= 6 ? chauffeurIds : Array(10).fill(chauffeurIds[0] || ''),
      fournisseurIds.length >= 3 ? fournisseurIds : []
    );
    for (const e of expensesSeed) {
      const payload: any = { ...e };
      if (!payload.tripId) delete payload.tripId;
      if (!payload.chauffeurId) delete payload.chauffeurId;
      if (!payload.fournisseurId) delete payload.fournisseurId;
      if (!payload.quantite) delete payload.quantite;
      if (!payload.prixUnitaire) delete payload.prixUnitaire;
      await expensesApi.create(payload);
    }
    success.push('Dépenses (10)');
  } catch (e) {
    errors.push(`Dépenses: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // 6. Factures
  try {
    const invoicesSeed = getInvoicesSeed(tripIds.length >= 10 ? tripIds : Array(10).fill(tripIds[0] || ''));
    for (const inv of invoicesSeed) {
      const payload: any = { ...inv };
      if (!payload.trajetId) delete payload.trajetId;
      if (!payload.datePaiement) delete payload.datePaiement;
      if (!payload.modePaiement) delete payload.modePaiement;
      if (!payload.montantPaye) delete payload.montantPaye;
      await invoicesApi.create(payload);
    }
    success.push('Factures (10)');
  } catch (e) {
    errors.push(`Factures: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // 7. Banque (localStorage)
  try {
    let bal1 = 5000000, bal2 = 2000000;
    for (const t of BANK_TRANSACTIONS_SEED) {
      if (t.compteId === 'bank-1') {
        if (t.type === 'depot' || t.type === 'virement') bal1 += t.montant;
        else bal1 -= t.montant;
      } else {
        if (t.type === 'depot' || t.type === 'virement') bal2 += t.montant;
        else bal2 -= t.montant;
      }
    }
    const accountsWithBalance = [
      { ...BANK_ACCOUNTS_SEED[0], soldeActuel: bal1 },
      { ...BANK_ACCOUNTS_SEED[1], soldeActuel: bal2 },
    ];
    localStorage.setItem('bank_accounts', JSON.stringify(accountsWithBalance));
    localStorage.setItem('bank_transactions', JSON.stringify(BANK_TRANSACTIONS_SEED));
    success.push('Banque (2 comptes, 10 transactions)');
  } catch (e) {
    errors.push(`Banque: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // 8. Caisse (localStorage)
  try {
    localStorage.setItem('caisse_transactions', JSON.stringify(CAISSE_TRANSACTIONS_SEED));
    localStorage.setItem('caisse_solde_initial', '500000');
    success.push('Caisse (10 transactions)');
  } catch (e) {
    errors.push(`Caisse: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // 9. Crédits (localStorage)
  try {
    localStorage.setItem('credits_data', JSON.stringify(CREDITS_SEED));
    success.push('Crédits (10 entrées)');
  } catch (e) {
    errors.push(`Crédits: ${e instanceof Error ? e.message : 'Erreur'}`);
  }

  // Rafraîchir le contexte
  if (refreshCallbacks) {
    try {
      await Promise.all([
        refreshCallbacks.refreshTrucks?.(),
        refreshCallbacks.refreshDrivers?.(),
        refreshCallbacks.refreshTrips?.(),
        refreshCallbacks.refreshExpenses?.(),
        refreshCallbacks.refreshInvoices?.(),
        refreshCallbacks.refreshThirdParties?.(),
      ]);
    } catch {
      // Ignore
    }
  }

  return { success, errors };
}
