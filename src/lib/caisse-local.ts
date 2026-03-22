/**
 * Lecture / écriture caisse (même source que Caisse.tsx — localStorage).
 */

export const CAISSE_STORAGE_KEY = 'caisse_transactions';

export interface CaisseTransaction {
  id: string;
  type: 'entree' | 'sortie';
  montant: number;
  date: string;
  description: string;
  categorie?: string;
  reference?: string;
  compteBanqueId?: string;
  bankTransactionId?: string;
  /**
   * Don reçu (entrée) ou don versé (sortie) : compte dans le solde caisse,
   * mais exclu du « revenu d’activité » (les totaux revenus/bénéfice du tableau de bord
   * restent basés sur les factures et dépenses, pas sur la caisse).
   */
  exclutRevenu?: boolean;
}

/** Entrée marquée comme don reçu (hors revenu d’activité). */
export function isDonRecu(t: CaisseTransaction): boolean {
  return t.type === 'entree' && t.exclutRevenu === true;
}

/** Sortie marquée comme don versé (hors charges enregistrées comme dépenses). */
export function isDonVerse(t: CaisseTransaction): boolean {
  return t.type === 'sortie' && t.exclutRevenu === true;
}

export function getCaisseTransactions(): CaisseTransaction[] {
  try {
    const s = localStorage.getItem(CAISSE_STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function setCaisseTransactions(transactions: CaisseTransaction[]): void {
  localStorage.setItem(CAISSE_STORAGE_KEY, JSON.stringify(transactions));
}

/**
 * Paiement facture (tout mode sauf virement bancaire) → entrée de caisse automatique.
 * (Les virements passent par la banque — voir bank-local.)
 */
export function appendEntreeFromInvoicePayment(params: {
  montant: number;
  date: string;
  factureNumero: string;
  factureId: string;
  modeLibelle?: string;
}): void {
  if (params.montant <= 0) return;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const newTx: CaisseTransaction = {
    id,
    type: 'entree',
    montant: params.montant,
    date: params.date,
    description: `Encaissement facture ${params.factureNumero}${params.modeLibelle ? ` (${params.modeLibelle})` : ''}`,
    reference: `facture:${params.factureId}`,
    categorie: 'Encaissements clients',
  };
  setCaisseTransactions([...getCaisseTransactions(), newTx]);
}

/**
 * Tout paiement facture **sauf virement bancaire** est enregistré en caisse (espèces, chèque, mobile money, etc.).
 * Le virement est la seule voie « banque » automatique.
 */
export function isPaiementVersBanque(mode: string | undefined): boolean {
  if (!mode) return false;
  return mode.trim().toLowerCase().includes('virement');
}

/** @deprecated utiliser !isPaiementVersBanque — conservé pour compat imports */
export function isModeEncaissementCaisse(mode: string | undefined): boolean {
  if (!mode) return true;
  return !isPaiementVersBanque(mode);
}

const REF_DEPENSE_PREFIX = 'depense:';

/** Sortie de caisse liée à une dépense (remplace l’ancienne ligne si même dépense). */
export function upsertSortieFromExpense(expense: {
  id: string;
  montant: number;
  date: string;
  description: string;
  categorie: string;
}): void {
  if (!Number.isFinite(expense.montant) || expense.montant <= 0) return;
  const ref = `${REF_DEPENSE_PREFIX}${expense.id}`;
  const dateStr = expense.date.includes('T') ? expense.date.split('T')[0] : expense.date;
  const txs = getCaisseTransactions().filter((t) => t.reference !== ref);
  const tx: CaisseTransaction = {
    id: `caisse-dep-${expense.id}`,
    type: 'sortie',
    montant: expense.montant,
    date: dateStr,
    description: `Dépense — ${expense.description}`,
    reference: ref,
    categorie: expense.categorie || 'Dépenses',
  };
  setCaisseTransactions([...txs, tx]);
}

/** Supprime la sortie caisse liée à une dépense (à la suppression de la dépense). */
export function removeCaisseLienDepense(expenseId: string): void {
  const ref = `${REF_DEPENSE_PREFIX}${expenseId}`;
  setCaisseTransactions(getCaisseTransactions().filter((t) => t.reference !== ref));
}
