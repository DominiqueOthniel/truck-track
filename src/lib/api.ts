/**
 * Client API pour Truck Track
 * Communique avec le backend NestJS
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erreur ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Types (ré-export pour cohérence)
export interface TruckPayload {
  immatriculation: string;
  modele: string;
  type: 'tracteur' | 'remorqueuse';
  statut: 'actif' | 'inactif';
  dateMiseEnCirculation: string;
  photo?: string;
  proprietaireId?: string;
  chauffeurId?: string;
}

export interface TripPayload {
  tracteurId?: string;
  remorqueuseId?: string;
  origine: string;
  destination: string;
  origineLat?: number;
  origineLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  chauffeurId: string;
  dateDepart: string;
  dateArrivee?: string;
  recette: number;
  prefinancement?: number;
  client?: string;
  marchandise?: string;
  description?: string;
  statut: 'planifie' | 'en_cours' | 'termine' | 'annule';
}

export interface ExpensePayload {
  camionId: string;
  tripId?: string;
  chauffeurId?: string;
  categorie: string;
  sousCategorie?: string;
  fournisseurId?: string;
  montant: number;
  quantite?: number;
  prixUnitaire?: number;
  date: string;
  description: string;
}

export interface InvoicePayload {
  numero: string;
  trajetId?: string;
  expenseId?: string;
  statut: 'en_attente' | 'payee';
  montantHT: number;
  remise?: number;
  montantHTApresRemise?: number;
  tva?: number;
  tps?: number;
  montantTTC: number;
  montantPaye?: number;
  dateCreation: string;
  datePaiement?: string;
  modePaiement?: string;
  notes?: string;
}

export interface DriverPayload {
  nom: string;
  prenom: string;
  telephone: string;
  cni?: string;
  photo?: string;
  transactions?: Array<{ type: 'apport' | 'sortie'; montant: number; date: string; description: string }>;
}

export interface ThirdPartyPayload {
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  type: 'proprietaire' | 'client' | 'fournisseur';
  notes?: string;
}

export interface BankAccountPayload {
  nom: string;
  numeroCompte: string;
  banque: string;
  type: 'courant' | 'epargne' | 'professionnel';
  soldeInitial: number;
  devise?: string;
  iban?: string;
  swift?: string;
  notes?: string;
}

export interface BankTransactionPayload {
  compteId: string;
  type: 'depot' | 'retrait' | 'virement' | 'prelevement' | 'frais';
  montant: number;
  date: string;
  description: string;
  reference?: string;
  beneficiaire?: string;
  categorie?: string;
}

// --- Trucks ---
export const trucksApi = {
  getAll: () => request<any[]>('/trucks'),
  getOne: (id: string) => request<any>(`/trucks/${id}`),
  create: (data: TruckPayload) => request<any>('/trucks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<TruckPayload>) => request<any>(`/trucks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/trucks/${id}`, { method: 'DELETE' }),
};

// --- Drivers ---
export const driversApi = {
  getAll: () => request<any[]>('/drivers'),
  getOne: (id: string) => request<any>(`/drivers/${id}`),
  create: (data: DriverPayload) => request<any>('/drivers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<DriverPayload>) => request<any>(`/drivers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/drivers/${id}`, { method: 'DELETE' }),
};

// --- Trips ---
export const tripsApi = {
  getAll: () => request<any[]>('/trips'),
  getOne: (id: string) => request<any>(`/trips/${id}`),
  create: (data: TripPayload) => request<any>('/trips', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<TripPayload>) => request<any>(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/trips/${id}`, { method: 'DELETE' }),
};

// --- Expenses ---
export const expensesApi = {
  getAll: () => request<any[]>('/expenses'),
  getOne: (id: string) => request<any>(`/expenses/${id}`),
  create: (data: ExpensePayload) => request<any>('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ExpensePayload>) => request<any>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/expenses/${id}`, { method: 'DELETE' }),
};

// --- Invoices ---
export const invoicesApi = {
  getAll: () => request<any[]>('/invoices'),
  getOne: (id: string) => request<any>(`/invoices/${id}`),
  create: (data: InvoicePayload) => request<any>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<InvoicePayload>) => request<any>(`/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/invoices/${id}`, { method: 'DELETE' }),
};

// --- Third Parties ---
export const thirdPartiesApi = {
  getAll: () => request<any[]>('/third-parties'),
  getOne: (id: string) => request<any>(`/third-parties/${id}`),
  create: (data: ThirdPartyPayload) => request<any>('/third-parties', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: Partial<ThirdPartyPayload>) => request<any>(`/third-parties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/third-parties/${id}`, { method: 'DELETE' }),
};

// --- Admin ---
export const adminApi = {
  purge: () => request<{ message: string }>('/admin/purge', { method: 'DELETE' }),
  backup: () => fetch(`${API_URL}/admin/backup`),
  restore: (data: object) => request<{ message: string; counts: Record<string, number> }>('/admin/restore', {
    method: 'POST',
    body: JSON.stringify({ data }),
  }),
};

// --- Bank ---
export const bankApi = {
  getAccounts: () => request<any[]>('/bank/accounts'),
  getAccount: (id: string) => request<any>(`/bank/accounts/${id}`),
  createAccount: (data: BankAccountPayload) => request<any>('/bank/accounts', { method: 'POST', body: JSON.stringify(data) }),
  updateAccount: (id: string, data: Partial<BankAccountPayload>) => request<any>(`/bank/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAccount: (id: string) => request<void>(`/bank/accounts/${id}`, { method: 'DELETE' }),
  getTransactions: () => request<any[]>('/bank/transactions'),
  createTransaction: (data: BankTransactionPayload) => request<any>('/bank/transactions', { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (id: string, data: Partial<BankTransactionPayload>) => request<any>(`/bank/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (id: string) => request<void>(`/bank/transactions/${id}`, { method: 'DELETE' }),
};
