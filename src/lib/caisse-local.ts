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
 * Paiement facture en espèces / Mobile Money → entrée de caisse automatique.
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

/** Espèces ou Mobile Money : l’argent entre physiquement en caisse (pas virement / pas chèque). */
export function isModeEncaissementCaisse(mode: string | undefined): boolean {
  if (!mode) return false;
  const m = mode.trim().toLowerCase();
  if (m.includes('virement')) return false;
  if (m.includes('chèque') || m.includes('cheque')) return false;
  return m.includes('espèce') || m.includes('especes') || m.includes('mobile money');
}
