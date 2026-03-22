/**
 * Lecture / écriture des comptes et transactions bancaires (même source que Bank.tsx).
 * Permet à la Caisse de créer des retraits liés aux entrées de caisse.
 */
import type { BankAccount, BankTransaction } from '@/pages/Bank';
import { isBankCreditType } from '@/lib/bank-rules';

const ACCOUNTS_KEY = 'bank_accounts';
const TRANSACTIONS_KEY = 'bank_transactions';

export function getBankAccounts(): BankAccount[] {
  try {
    const s = localStorage.getItem(ACCOUNTS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function getBankTransactions(): BankTransaction[] {
  try {
    const s = localStorage.getItem(TRANSACTIONS_KEY);
    return s ? JSON.parse(s) : [];
  } catch {
    return [];
  }
}

export function setBankAccounts(accounts: BankAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function setBankTransactions(transactions: BankTransaction[]): void {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

/** Solde calculé comme sur la page Banque (soldeInitial + mouvements). */
export function calculateAccountBalance(
  accountId: string,
  accounts: BankAccount[],
  transactions: BankTransaction[],
): number {
  const account = accounts.find((a) => a.id === accountId);
  if (!account) return 0;
  let balance = account.soldeInitial;
  transactions
    .filter((t) => t.compteId === accountId)
    .forEach((transaction) => {
      balance += isBankCreditType(transaction.type)
        ? transaction.montant
        : -transaction.montant;
    });
  return balance;
}

export function recalculateAllBalances(
  accounts: BankAccount[],
  transactions: BankTransaction[],
): BankAccount[] {
  return accounts.map((acc) => ({
    ...acc,
    soldeActuel: calculateAccountBalance(acc.id, accounts, transactions),
  }));
}

/** Retrait bancaire pour alimenter la caisse (entrée caisse). */
export function addRetraitPourCaisse(params: {
  compteId: string;
  montant: number;
  date: string;
  descriptionCaisse: string;
  caisseTransactionId: string;
}): { ok: true; bankTransactionId: string } | { ok: false; message: string } {
  const accounts = getBankAccounts();
  const transactions = getBankTransactions();
  const disponible = calculateAccountBalance(params.compteId, accounts, transactions);

  if (params.montant <= 0) {
    return { ok: false, message: 'Le montant doit être positif.' };
  }
  if (disponible < params.montant) {
    return {
      ok: false,
      message: `Solde bancaire insuffisant. Disponible : ${disponible.toLocaleString('fr-FR')} FCFA`,
    };
  }

  const bankTransactionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const newTx: BankTransaction = {
    id: bankTransactionId,
    compteId: params.compteId,
    type: 'retrait',
    montant: params.montant,
    date: params.date,
    description: `Alimentation caisse — ${params.descriptionCaisse}`,
    reference: `caisse:${params.caisseTransactionId}`,
    categorie: 'Caisse',
  };

  const newTransactions = [...transactions, newTx];
  setBankTransactions(newTransactions);
  setBankAccounts(recalculateAllBalances(accounts, newTransactions));

  return { ok: true, bankTransactionId };
}

export function removeBankTransaction(bankTransactionId: string): void {
  const accounts = getBankAccounts();
  const transactions = getBankTransactions().filter((t) => t.id !== bankTransactionId);
  setBankTransactions(transactions);
  setBankAccounts(recalculateAllBalances(accounts, transactions));
}

/** Réinsère une transaction (ex. rollback après échec). */
export function appendBankTransaction(tx: BankTransaction): void {
  const accounts = getBankAccounts();
  const transactions = [...getBankTransactions(), tx];
  setBankTransactions(transactions);
  setBankAccounts(recalculateAllBalances(accounts, transactions));
}

/** Même clés que la page Caisse — solde espèces recalculé depuis le localStorage. */
const CAISSE_TX_KEY = 'caisse_transactions';
const CAISSE_SOLDE_INITIAL_KEY = 'caisse_solde_initial';

export function getCaisseSoldeActuel(): number {
  try {
    const saved = localStorage.getItem(CAISSE_TX_KEY);
    const transactions: { type: string; montant: number }[] = saved ? JSON.parse(saved) : [];
    const soldeInitial = parseFloat(localStorage.getItem(CAISSE_SOLDE_INITIAL_KEY) || '0') || 0;
    return (
      soldeInitial +
      transactions.reduce((sum, t) => (t.type === 'entree' ? sum + t.montant : sum - t.montant), 0)
    );
  } catch {
    return 0;
  }
}

/** Somme des soldes disponibles de tous les comptes (même logique que Banque / Caisse). */
export function getTotalBanqueDisponible(): number {
  const accs = getBankAccounts();
  const txs = getBankTransactions();
  if (accs.length === 0) return 0;
  return accs.reduce((s, a) => s + calculateAccountBalance(a.id, accs, txs), 0);
}
