import React, { createContext, useContext, useState, ReactNode } from 'react';

// Types
export type TruckType = 'tracteur' | 'remorqueuse';
export type TruckStatus = 'actif' | 'inactif';

export interface TruckGPS {
  imei?: string; // Numéro IMEI de l'appareil GPS
  simNumber?: string; // Numéro de téléphone SIM dans le GPS
  deviceModel?: string; // Modèle de l'appareil GPS (ex: TK103, GT06, etc.)
  isActive?: boolean; // GPS actif ou non
  lastUpdate?: string; // Dernière mise à jour de position
  trackingInterval?: number; // Intervalle de tracking en secondes (ex: 60 pour 1 minute)
  webhookUrl?: string; // URL webhook pour recevoir les données GPS
  apiKey?: string; // Clé API pour l'authentification
}

export interface Truck {
  id: string;
  immatriculation: string;
  modele: string;
  type: TruckType;
  statut: TruckStatus;
  dateMiseEnCirculation: string;
  photo?: string;
  proprietaireId?: string;
  gps?: TruckGPS; // Configuration GPS
}

export type TripStatus = 'planifie' | 'en_cours' | 'termine' | 'annule';

export interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: string; // ISO date string
  address?: string; // Adresse formatée (optionnel)
  speed?: number; // Vitesse en km/h (optionnel)
  note?: string; // Note optionnelle
}

export interface Trip {
  id: string;
  tracteurId?: string;
  remorqueuseId?: string;
  origine: string;
  destination: string;
  chauffeurId: string;
  dateDepart: string;
  dateArrivee: string;
  recette: number;
  prefinancement?: number; // Montant de préfinancement (optionnel)
  client?: string;
  marchandise?: string;
  description?: string;
  statut: TripStatus;
  trackingPoints?: TrackingPoint[]; // Points de tracking GPS
}

export interface Expense {
  id: string;
  camionId: string;
  tripId?: string; // Lien optionnel vers un trajet
  chauffeurId?: string;
  categorie: string;
  sousCategorie?: string;
  fournisseurId?: string;
  montant: number; // Prix total
  quantite?: number; // Quantité (ex: litres pour carburant)
  prixUnitaire?: number; // Prix par unité
  date: string;
  description: string;
}

export type InvoiceStatus = 'en_attente' | 'payee';

export interface Invoice {
  id: string;
  numero: string;
  trajetId?: string;
  expenseId?: string;
  statut: InvoiceStatus;
  montantHT: number;
  remise?: number; // Remise en pourcentage (optionnel)
  montantHTApresRemise?: number; // Montant HT après application de la remise
  tva?: number;
  tps?: number;
  montantTTC: number;
  montantPaye?: number; // Montant déjà payé par le client (pour paiement partiel)
  dateCreation: string;
  datePaiement?: string;
  modePaiement?: string;
  notes?: string;
}

export interface DriverTransaction {
  id: string;
  type: 'apport' | 'sortie';
  montant: number;
  date: string;
  description: string;
}

export interface Driver {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  cni?: string;
  photo?: string;
  transactions: DriverTransaction[];
}

interface AppContextType {
  trucks: Truck[];
  setTrucks: React.Dispatch<React.SetStateAction<Truck[]>>;
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  drivers: Driver[];
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>;
  thirdParties: ThirdParty[];
  setThirdParties: React.Dispatch<React.SetStateAction<ThirdParty[]>>;
  subCategories: Record<string, string[]>;
  setSubCategories: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock Data
const initialTrucks: Truck[] = [
  { id: '1', immatriculation: 'CM-7890-X', modele: 'Volvo FH16', type: 'tracteur', statut: 'actif', dateMiseEnCirculation: '2022-01-10', proprietaireId: '1' },
  { id: '2', immatriculation: 'CM-4567-Y', modele: 'Mercedes Actros', type: 'tracteur', statut: 'actif', dateMiseEnCirculation: '2021-08-15', proprietaireId: '2' },
  { id: '3', immatriculation: 'CM-2345-Z', modele: 'Scania R450', type: 'tracteur', statut: 'actif', dateMiseEnCirculation: '2020-05-20' },
  { id: '4', immatriculation: 'CM-8901-A', modele: 'Krone Cool Liner', type: 'remorqueuse', statut: 'actif', dateMiseEnCirculation: '2021-11-12', proprietaireId: '1' },
  { id: '5', immatriculation: 'CM-5678-B', modele: 'Schmitz Cargobull', type: 'remorqueuse', statut: 'actif', dateMiseEnCirculation: '2019-09-08', proprietaireId: '3' },
  { id: '6', immatriculation: 'CM-3456-C', modele: 'Frigoblock', type: 'remorqueuse', statut: 'inactif', dateMiseEnCirculation: '2018-03-25' },
];

const initialDrivers: Driver[] = [
  { id: '1', nom: 'Ndjock', prenom: 'Jean', telephone: '+237 6 98 76 54 32', cni: 'CE-112233445', transactions: [
    { id: 't1', type: 'apport', montant: 3000000, date: '2024-01-10', description: 'Apport initial' },
    { id: 't2', type: 'sortie', montant: 450000, date: '2024-02-15', description: 'Frais de réparation' },
    { id: 't3', type: 'apport', montant: 1200000, date: '2024-03-01', description: 'Recette trajet Douala-Yaoundé' },
  ]},
  { id: '2', nom: 'Fotso', prenom: 'Marie', telephone: '+237 6 55 44 33 22', cni: 'CE-556677889', transactions: [
    { id: 't4', type: 'apport', montant: 2000000, date: '2024-01-20', description: 'Apport initial' },
    { id: 't5', type: 'sortie', montant: 300000, date: '2024-02-28', description: 'Frais de carburant' },
  ]},
  { id: '3', nom: 'Tchouassi', prenom: 'Pierre', telephone: '+237 6 11 22 33 44', cni: 'CE-998877665', transactions: [
    { id: 't6', type: 'apport', montant: 1800000, date: '2024-02-05', description: 'Apport initial' },
  ]},
  { id: '4', nom: 'Mvondo', prenom: 'Sophie', telephone: '+237 6 77 66 55 44', cni: 'CE-443322110', transactions: [
    { id: 't7', type: 'apport', montant: 2500000, date: '2024-01-15', description: 'Apport initial' },
    { id: 't8', type: 'sortie', montant: 500000, date: '2024-03-10', description: 'Frais divers' },
  ]},
];

const initialTrips: Trip[] = [
  { id: '1', tracteurId: '1', remorqueuseId: '4', origine: 'Douala', destination: 'Yaoundé', chauffeurId: '1', dateDepart: '2024-03-15', dateArrivee: '2024-03-16', recette: 850000, client: 'Entreprise TransLog', marchandise: 'Équipements électroniques', description: 'Transport d\'équipements informatiques', statut: 'termine' },
  { id: '2', tracteurId: '2', origine: 'Garoua', destination: 'Maroua', chauffeurId: '2', dateDepart: '2024-03-20', dateArrivee: '2024-03-21', recette: 650000, client: 'Distributeur Nord', marchandise: 'Produits alimentaires', description: 'Livraison de denrées alimentaires', statut: 'termine' },
  { id: '3', tracteurId: '3', remorqueuseId: '5', origine: 'Yaoundé', destination: 'Bafoussam', chauffeurId: '3', dateDepart: '2024-03-25', dateArrivee: '', recette: 550000, client: 'BTP Ouest', marchandise: 'Matériaux de construction', description: 'Transport de ciment et fer', statut: 'en_cours' },
  { id: '4', tracteurId: '1', origine: 'Douala', destination: 'Kribi', chauffeurId: '4', dateDepart: '2024-04-01', dateArrivee: '', recette: 450000, client: 'Port Autonome', marchandise: 'Conteneurs', description: 'Transport de conteneurs', statut: 'planifie' },
  { id: '5', tracteurId: '2', remorqueuseId: '4', origine: 'Bamenda', destination: 'Buea', chauffeurId: '1', dateDepart: '2024-02-28', dateArrivee: '2024-03-01', recette: 400000, client: 'Commerce Sud-Ouest', marchandise: 'Marchandises diverses', description: 'Livraison générale', statut: 'termine' },
];

const initialExpenses: Expense[] = [
  { id: '1', camionId: '1', chauffeurId: '1', categorie: 'Carburant', sousCategorie: 'Diesel', montant: 280000, date: '2024-03-15', description: 'Plein diesel complet', fournisseurId: '4' },
  { id: '2', camionId: '2', chauffeurId: '2', categorie: 'Maintenance', sousCategorie: 'Révision', montant: 500000, date: '2024-03-18', description: 'Révision générale et changement d\'huile', fournisseurId: '5' },
  { id: '3', camionId: '1', chauffeurId: '1', categorie: 'Péage', montant: 50000, date: '2024-03-15', description: 'Péage autoroute Douala-Yaoundé' },
  { id: '4', camionId: '3', chauffeurId: '3', categorie: 'Carburant', sousCategorie: 'Diesel', montant: 250000, date: '2024-03-25', description: 'Plein diesel', fournisseurId: '4' },
  { id: '5', camionId: '4', categorie: 'Assurance', montant: 1200000, date: '2024-01-01', description: 'Assurance annuelle remorqueuse' },
  { id: '6', camionId: '2', chauffeurId: '2', categorie: 'Péage', montant: 35000, date: '2024-03-20', description: 'Péage Garoua-Maroua' },
];

const initialInvoices: Invoice[] = [
  { 
    id: '1', 
    numero: 'FAC-2024-001',
    trajetId: '1', 
    statut: 'payee', 
    montantHT: 850000,
    tva: 0,
    tps: 0,
    montantTTC: 850000,
    montantPaye: 850000,
    dateCreation: '2024-03-16', 
    datePaiement: '2024-03-20',
    modePaiement: 'Virement bancaire'
  },
  { 
    id: '2', 
    numero: 'FAC-2024-002',
    trajetId: '2', 
    statut: 'en_attente', 
    montantHT: 650000,
    tva: 0,
    tps: 0,
    montantTTC: 650000,
    montantPaye: 0,
    dateCreation: '2024-03-21'
  },
  { 
    id: '3', 
    numero: 'FAC-2024-003',
    trajetId: '5', 
    statut: 'payee', 
    montantHT: 400000,
    tva: 0,
    tps: 0,
    montantTTC: 400000,
    montantPaye: 400000,
    dateCreation: '2024-03-01',
    datePaiement: '2024-03-05',
    modePaiement: 'Espèces'
  },
];


export type ThirdPartyType = 'proprietaire' | 'client' | 'fournisseur';

export interface ThirdParty {
  id: string;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  type: ThirdPartyType;
  notes?: string;
}

const initialThirdParties: ThirdParty[] = [
  { id: '1', nom: 'Transport Logistique SA', type: 'proprietaire', telephone: '+237 6 99 88 77 66', email: 'contact@translog.cm', adresse: 'Douala, Zone Industrielle', notes: 'Propriétaire principal de la flotte' },
  { id: '2', nom: 'Jean Mbarga', type: 'proprietaire', telephone: '+237 6 44 55 66 77', adresse: 'Yaoundé, Mvog-Ada', notes: 'Propriétaire indépendant' },
  { id: '3', nom: 'Société Camerounaise de Transport', type: 'proprietaire', telephone: '+237 6 33 22 11 00', email: 'info@sct.cm', adresse: 'Bafoussam, Centre-ville' },
  { id: '4', nom: 'Total Energies Cameroun', type: 'fournisseur', telephone: '+237 2 33 44 55 66', email: 'contact@total.cm', adresse: 'Douala, Bonanjo', notes: 'Fournisseur de carburant principal' },
  { id: '5', nom: 'Garage Central', type: 'fournisseur', telephone: '+237 6 88 99 00 11', adresse: 'Yaoundé, Nlongkak', notes: 'Service de maintenance' },
  { id: '6', nom: 'Entreprise TransLog', type: 'client', telephone: '+237 6 11 22 33 44', email: 'contact@translog-entreprise.cm', adresse: 'Douala, Akwa' },
  { id: '7', nom: 'Distributeur Nord', type: 'client', telephone: '+237 6 22 33 44 55', adresse: 'Garoua, Centre-ville' },
  { id: '8', nom: 'BTP Ouest', type: 'client', telephone: '+237 6 77 88 99 00', email: 'btp@ouest.cm', adresse: 'Bafoussam, Quartier administratif' },
];

const initialSubCategories: Record<string, string[]> = {
  'Carburant': ['Diesel', 'Essence', 'AdBlue'],
  'Maintenance': ['Révision', 'Réparation', 'Pièces détachées', 'Vidange'],
  'Péage': ['Autoroute', 'Pont', 'Tunnel'],
  'Assurance': ['Assurance véhicule', 'Assurance responsabilité'],
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [trucks, setTrucks] = useState<Truck[]>(initialTrucks);
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [thirdParties, setThirdParties] = useState<ThirdParty[]>(initialThirdParties);
  const [subCategories, setSubCategories] = useState<Record<string, string[]>>(initialSubCategories);

  return (
    <AppContext.Provider value={{
      trucks, setTrucks,
      trips, setTrips,
      expenses, setExpenses,
      invoices, setInvoices,
      drivers, setDrivers,
      thirdParties, setThirdParties,
      subCategories, setSubCategories,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};
