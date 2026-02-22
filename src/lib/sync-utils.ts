/**
 * Utilitaires de synchronisation des données entre les modules
 */

import { Trip, Expense, Driver, Truck, Invoice, DriverTransaction } from '@/contexts/AppContext';

/**
 * Synchronise les dépenses avec les transactions des chauffeurs
 */
export const syncExpenseWithDriver = (
  expense: Expense,
  drivers: Driver[],
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>
): void => {
  if (!expense.chauffeurId) return;

  const driver = drivers.find(d => d.id === expense.chauffeurId);
  if (!driver) return;

  // Vérifier si la transaction existe déjà
  const existingTransaction = driver.transactions.find(
    t => t.id === `expense_${expense.id}`
  );

  if (!existingTransaction) {
    const driverTransaction: DriverTransaction = {
      id: `expense_${expense.id}`,
      type: 'sortie',
      montant: expense.montant,
      date: expense.date,
      description: `Dépense: ${expense.description} (${expense.categorie})`,
    };

    setDrivers(drivers.map(d =>
      d.id === expense.chauffeurId
        ? { ...d, transactions: [...d.transactions, driverTransaction] }
        : d
    ));
  }
};

/**
 * Supprime la transaction du chauffeur quand une dépense est supprimée
 */
export const removeExpenseFromDriver = (
  expenseId: string,
  chauffeurId: string | undefined,
  drivers: Driver[],
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>
): void => {
  if (!chauffeurId) return;

  setDrivers(drivers.map(d =>
    d.id === chauffeurId
      ? {
          ...d,
          transactions: d.transactions.filter(t => t.id !== `expense_${expenseId}`)
        }
      : d
  ));
};

/**
 * Calcule le montant total payé pour un trajet à partir de toutes ses factures
 */
export const calculatePaidAmountForTrip = (tripId: string, invoices: Invoice[]): number => {
  return invoices
    .filter(inv => inv.trajetId === tripId)
    .reduce((sum, inv) => sum + (inv.montantPaye || 0), 0);
};

/**
 * Met à jour les recettes d'un trajet quand une facture est payée (partiellement ou complètement)
 * La recette du trajet représente le montant total payé par le client
 */
export const syncInvoicePaymentWithTrip = (
  invoice: Invoice,
  trips: Trip[],
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>,
  invoices: Invoice[]
): void => {
  const trip = trips.find(t => t.id === invoice.trajetId);
  if (!trip) return;

  // Calculer le montant total payé pour ce trajet
  const totalPaid = calculatePaidAmountForTrip(invoice.trajetId, invoices);
  
  // Mettre à jour la recette du trajet avec le montant total payé
  setTrips(trips.map(t =>
    t.id === invoice.trajetId
      ? { ...t, recette: totalPaid }
      : t
  ));
};

/**
 * Vérifie si un camion est actuellement utilisé dans un trajet en cours
 */
export const isTruckInUse = (truckId: string, trips: Trip[]): boolean => {
  return trips.some(trip =>
    (trip.tracteurId === truckId || trip.remorqueuseId === truckId) &&
    (trip.statut === 'en_cours' || trip.statut === 'planifie')
  );
};

/**
 * Vérifie si un chauffeur est actuellement en mission
 */
export const isDriverOnMission = (driverId: string, trips: Trip[]): boolean => {
  return trips.some(trip =>
    trip.chauffeurId === driverId &&
    (trip.statut === 'en_cours' || trip.statut === 'planifie')
  );
};

/**
 * Met à jour automatiquement le statut d'un camion en fonction de son utilisation
 */
export const updateTruckStatus = (
  truck: Truck,
  trips: Trip[],
  trucks: Truck[],
  setTrucks: React.Dispatch<React.SetStateAction<Truck[]>>
): void => {
  const inUse = isTruckInUse(truck.id, trips);
  
  // Si le camion est utilisé mais marqué inactif, on le passe en actif
  if (inUse && truck.statut === 'inactif') {
    setTrucks(trucks.map(t =>
      t.id === truck.id ? { ...t, statut: 'actif' } : t
    ));
  }
};

/** Entrée d’affichage pour la liste des transactions (trajet, dépense ou manuelle) */
export interface DriverTransactionDisplay {
  id: string;
  type: 'apport' | 'sortie';
  montant: number;
  date: string;
  description: string;
  source: 'trajet' | 'depense' | 'manuel';
}

/**
 * Calcule les statistiques d'un chauffeur à partir des trajets, dépenses et transactions manuelles.
 * - Apports = recettes des trajets terminés du chauffeur + transactions manuelles type "apport"
 * - Sorties = dépenses imputées au chauffeur + transactions manuelles type "sortie"
 */
export const calculateDriverStatsFromTripsAndExpenses = (
  driverId: string,
  driver: Driver,
  trips: Trip[],
  expenses: Expense[]
) => {
  const driverTrips = trips.filter(
    t => t.chauffeurId === driverId && t.statut === 'termine'
  );
  const driverExpenseIds = new Set(trips.filter(t => t.chauffeurId === driverId).map(t => t.id));
  const driverExpenses = expenses.filter(
    e => e.chauffeurId === driverId || (e.tripId && driverExpenseIds.has(e.tripId))
  );

  const apportsFromTrips = driverTrips.reduce((sum, t) => sum + t.recette, 0);
  const apportsFromManual = driver.transactions
    .filter(t => t.type === 'apport')
    .reduce((sum, t) => sum + t.montant, 0);
  const apports = apportsFromTrips + apportsFromManual;

  const sortiesFromExpenses = driverExpenses.reduce((sum, e) => sum + e.montant, 0);
  const sortiesFromManual = driver.transactions
    .filter(t => t.type === 'sortie')
    .reduce((sum, t) => sum + t.montant, 0);
  const sorties = sortiesFromExpenses + sortiesFromManual;

  const balance = apports - sorties;

  const fromTrips: DriverTransactionDisplay[] = driverTrips.map(t => ({
    id: `trip_${t.id}`,
    type: 'apport',
    montant: t.recette,
    date: t.dateArrivee || t.dateDepart,
    description: `Trajet: ${t.origine} → ${t.destination}`,
    source: 'trajet',
  }));
  const fromExpenses: DriverTransactionDisplay[] = driverExpenses.map(e => ({
    id: `expense_${e.id}`,
    type: 'sortie',
    montant: e.montant,
    date: e.date,
    description: `Dépense: ${e.description} (${e.categorie})`,
    source: 'depense',
  }));
  const fromManual: DriverTransactionDisplay[] = driver.transactions.map(t => ({
    id: t.id,
    type: t.type,
    montant: t.montant,
    date: t.date,
    description: t.description,
    source: 'manuel',
  }));

  const allTransactions: DriverTransactionDisplay[] = [
    ...fromTrips,
    ...fromExpenses,
    ...fromManual,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    apports,
    sorties,
    balance,
    apportsFromTrips,
    apportsFromManual,
    sortiesFromExpenses,
    sortiesFromManual,
    allTransactions,
  };
};

/**
 * Calcule les statistiques d'un chauffeur (uniquement transactions enregistrées).
 * Conservé pour compatibilité (ex: confirmation de suppression).
 */
export const calculateDriverStats = (driver: Driver) => {
  const apports = driver.transactions
    .filter(t => t.type === 'apport')
    .reduce((sum, t) => sum + t.montant, 0);
  
  const sorties = driver.transactions
    .filter(t => t.type === 'sortie')
    .reduce((sum, t) => sum + t.montant, 0);
  
  const balance = apports - sorties;
  
  return { apports, sorties, balance };
};

/**
 * Calcule les statistiques d'un camion
 * Utilise les montants payés pour calculer les revenus
 */
export const calculateTruckStats = (
  truckId: string, 
  trips: Trip[], 
  expenses: Expense[],
  invoices?: Invoice[]
) => {
  const truckTrips = trips.filter(
    t => (t.tracteurId === truckId || t.remorqueuseId === truckId) && t.statut === 'termine'
  );
  
  // Calculer les revenus à partir des montants payés
  const revenue = invoices
    ? truckTrips.reduce((sum, t) => sum + calculatePaidAmountForTrip(t.id, invoices), 0)
    : truckTrips.reduce((sum, t) => sum + t.recette, 0);
  
  const truckExpenses = expenses
    .filter(e => e.camionId === truckId)
    .reduce((sum, e) => sum + e.montant, 0);
  
  const profit = revenue - truckExpenses;
  const tripsCount = truckTrips.length;
  
  return { revenue, expenses: truckExpenses, profit, tripsCount };
};

/**
 * Vérifie si un trajet peut être supprimé (pas de facture associée)
 */
export const canDeleteTrip = (tripId: string, invoices: Invoice[]): boolean => {
  return !invoices.some(inv => inv.trajetId === tripId);
};

/**
 * Calcule les dépenses et le solde d'un trajet
 * Utilise les montants payés (recette) plutôt que le montant contractuel
 */
export const calculateTripStats = (
  tripId: string, 
  expenses: Expense[], 
  trip: Trip,
  invoices?: Invoice[]
) => {
  // Dépenses liées directement au trajet
  const tripExpenses = expenses
    .filter(e => e.tripId === tripId)
    .reduce((sum, e) => sum + e.montant, 0);
  
  // Préfinancement
  const prefinancement = trip.prefinancement || 0;
  
  // Recette = montant total payé (calculé à partir des factures si disponible, sinon utilise trip.recette)
  const recette = invoices 
    ? calculatePaidAmountForTrip(tripId, invoices)
    : trip.recette;
  
  // Solde = Recette - Préfinancement - Dépenses
  const solde = recette - prefinancement - tripExpenses;
  
  return {
    recette,
    prefinancement,
    expenses: tripExpenses,
    solde,
    expensesCount: expenses.filter(e => e.tripId === tripId).length
  };
};

/**
 * Supprime toutes les dépenses liées à un camion supprimé
 */
export const deleteExpensesForTruck = (
  truckId: string,
  expenses: Expense[],
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>,
  drivers: Driver[],
  setDrivers: React.Dispatch<React.SetStateAction<Driver[]>>
): void => {
  const truckExpenses = expenses.filter(e => e.camionId === truckId);
  
  // Supprimer les transactions liées des chauffeurs
  truckExpenses.forEach(expense => {
    if (expense.chauffeurId) {
      removeExpenseFromDriver(expense.id, expense.chauffeurId, drivers, setDrivers);
    }
  });
  
  // Supprimer les dépenses
  setExpenses(expenses.filter(e => e.camionId !== truckId));
};

/**
 * Vérifie si un chauffeur peut être supprimé (pas de trajet actif ou planifié)
 */
export const canDeleteDriver = (driverId: string, trips: Trip[]): boolean => {
  return !trips.some(trip =>
    trip.chauffeurId === driverId &&
    (trip.statut === 'en_cours' || trip.statut === 'planifie')
  );
};

/**
 * Obtient le nom complet d'un chauffeur
 */
export const getDriverFullName = (driverId: string, drivers: Driver[]): string => {
  const driver = drivers.find(d => d.id === driverId);
  return driver ? `${driver.prenom} ${driver.nom}` : 'Chauffeur inconnu';
};

/**
 * Obtient l'immatriculation d'un camion
 */
export const getTruckLabel = (truckId: string, trucks: Truck[]): string => {
  const truck = trucks.find(t => t.id === truckId);
  return truck ? `${truck.immatriculation} (${truck.modele})` : 'Camion inconnu';
};

/**
 * Génère un numéro de facture unique
 */
export const generateInvoiceNumber = (invoices: Invoice[]): string => {
  const year = new Date().getFullYear();
  const count = invoices.length + 1;
  return `FAC-${year}-${String(count).padStart(3, '0')}`;
};

/**
 * Calcule le montant total des factures en attente
 */
export const calculatePendingInvoicesAmount = (invoices: Invoice[]): number => {
  return invoices
    .filter(inv => inv.statut === 'en_attente')
    .reduce((sum, inv) => sum + inv.montantTTC, 0);
};

/**
 * Obtient les trajets disponibles pour facturation (sans facture existante)
 * Permet de créer une facture pour n'importe quel trajet à tout moment
 */
export const getAvailableTripsForInvoicing = (trips: Trip[], invoices: Invoice[]): Trip[] => {
  const invoicedTripIds = new Set(invoices.map(inv => inv.trajetId).filter((id): id is string => !!id));
  return trips.filter(trip => 
    trip.recette > 0 &&
    !invoicedTripIds.has(trip.id)
  );
};



