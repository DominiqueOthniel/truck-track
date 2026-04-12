import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Landmark, TrendingUp, TrendingDown, Search, X, FileDown, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';
import { EMOJI } from '@/lib/emoji-palette';
import { isBankCreditType, isBankDebitType } from '@/lib/bank-rules';
import {
  calculateAccountBalance,
  getBankAccounts,
  getBankTransactions,
  isRemoteBank,
  refreshBankFromApi,
} from '@/lib/bank-local';
import { bankApi } from '@/lib/api';

export interface BankAccount {
  id: string;
  nom: string;
  numeroCompte: string;
  banque: string;
  type: 'courant' | 'epargne' | 'professionnel';
  soldeInitial: number;
  soldeActuel: number;
  devise: string;
  iban?: string;
  swift?: string;
  notes?: string;
}

export interface BankTransaction {
  id: string;
  compteId: string;
  type: 'depot' | 'retrait' | 'virement' | 'prelevement' | 'frais';
  montant: number;
  date: string;
  description: string;
  reference?: string;
  beneficiaire?: string;
  categorie?: string;
}

function toBankDate(d: string): string {
  return d.includes('T') ? d.split('T')[0] : d;
}

export default function Bank() {
  const { canManageAccounting } = useAuth();
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [bankReady, setBankReady] = useState(false);

  const reloadBankState = async () => {
    await refreshBankFromApi();
    setAccounts(getBankAccounts());
    setTransactions(getBankTransactions());
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refreshBankFromApi();
        if (!cancelled) {
          setAccounts(getBankAccounts());
          setTransactions(getBankTransactions());
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          toast.error(
            e instanceof Error
              ? e.message
              : 'Impossible de charger la banque (vérifiez le backend et VITE_API_URL).',
          );
        }
      } finally {
        if (!cancelled) setBankReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<BankTransaction | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [accountFormData, setAccountFormData] = useState({
    nom: '',
    numeroCompte: '',
    banque: '',
    type: 'courant' as 'courant' | 'epargne' | 'professionnel',
    soldeInitial: 0,
    devise: 'FCFA',
    iban: '',
    swift: '',
    notes: '',
  });

  const [transactionFormData, setTransactionFormData] = useState({
    compteId: '',
    type: 'depot' as 'depot' | 'retrait' | 'virement' | 'prelevement' | 'frais',
    montant: 0,
    date: '',
    description: '',
    reference: '',
    beneficiaire: '',
    categorie: '',
  });

  // Sauvegarder les comptes
  const saveAccounts = (newAccounts: BankAccount[]) => {
    setAccounts(newAccounts);
    localStorage.setItem('bank_accounts', JSON.stringify(newAccounts));
  };

  // Sauvegarder les transactions
  const saveTransactions = (newTransactions: BankTransaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem('bank_transactions', JSON.stringify(newTransactions));
  };

  /** Solde = solde initial + mouvements (dépôt/virement = + ; retrait/prélèvement/frais = -). */
  const calculateBalance = (accountId: string): number =>
    calculateAccountBalance(accountId, accounts, transactions);

  /**
   * Recalcule les soldes à partir d’une liste de transactions **déjà à jour**.
   * Important : ne pas lire `transactions` depuis le state juste après `saveTransactions`,
   * car React n’a pas encore appliqué le nouveau state (dépôts ignorés sinon).
   */
  const syncBalancesFromTransactions = (txs: BankTransaction[]) => {
    const updatedAccounts = accounts.map((account) => ({
      ...account,
      soldeActuel: calculateAccountBalance(account.id, accounts, txs),
    }));
    saveAccounts(updatedAccounts);
  };

  const resetAccountForm = () => {
    setAccountFormData({
      nom: '',
      numeroCompte: '',
      banque: '',
      type: 'courant',
      soldeInitial: 0,
      devise: 'FCFA',
      iban: '',
      swift: '',
      notes: '',
    });
    setEditingAccount(null);
  };

  const resetTransactionForm = () => {
    setTransactionFormData({
      compteId: '',
      type: 'depot',
      montant: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      beneficiaire: '',
      categorie: '',
    });
    setEditingTransaction(null);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (isRemoteBank()) {
        const payload = {
          nom: accountFormData.nom,
          numeroCompte: accountFormData.numeroCompte,
          banque: accountFormData.banque,
          type: accountFormData.type,
          soldeInitial: accountFormData.soldeInitial,
          devise: accountFormData.devise || 'FCFA',
          iban: accountFormData.iban || undefined,
          swift: accountFormData.swift || undefined,
          notes: accountFormData.notes || undefined,
        };
        if (editingAccount) {
          await bankApi.updateAccount(editingAccount.id, payload);
          toast.success('Compte bancaire modifié avec succès');
        } else {
          await bankApi.createAccount(payload);
          toast.success('Compte bancaire ajouté avec succès');
        }
        await reloadBankState();
      } else if (editingAccount) {
        const mergedAccounts = accounts.map((acc) =>
          acc.id === editingAccount.id
            ? { ...acc, ...accountFormData, id: editingAccount.id }
            : acc,
        );
        const updatedAccounts = mergedAccounts.map((acc) => ({
          ...acc,
          soldeActuel: calculateAccountBalance(acc.id, mergedAccounts, transactions),
        }));
        saveAccounts(updatedAccounts);
        toast.success('Compte bancaire modifié avec succès');
      } else {
        const newAccount: BankAccount = {
          ...accountFormData,
          id: Date.now().toString(),
          soldeActuel: accountFormData.soldeInitial,
        };
        saveAccounts([...accounts, newAccount]);
        toast.success('Compte bancaire ajouté avec succès');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement compte');
      return;
    }

    setIsAccountDialogOpen(false);
    resetAccountForm();
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const montant = Number(transactionFormData.montant);
    if (!Number.isFinite(montant) || montant <= 0) {
      toast.error('Indique un montant valide (supérieur à 0).');
      return;
    }
    if (!transactionFormData.compteId) {
      toast.error('Sélectionnez un compte bancaire.');
      return;
    }

    const txsForCheck = editingTransaction
      ? transactions.filter((t) => t.id !== editingTransaction.id)
      : transactions;
    if (isBankDebitType(transactionFormData.type)) {
      const disponible = calculateAccountBalance(
        transactionFormData.compteId,
        accounts,
        txsForCheck,
      );
      if (montant > disponible) {
        toast.error(
          `Solde insuffisant sur ce compte. Disponible : ${disponible.toLocaleString('fr-FR')} FCFA`,
        );
        return;
      }
    }

    const dateStr = toBankDate(transactionFormData.date);
    const txPayload = {
      compteId: transactionFormData.compteId,
      type: transactionFormData.type,
      montant,
      date: dateStr,
      description: transactionFormData.description,
      reference: transactionFormData.reference || undefined,
      beneficiaire: transactionFormData.beneficiaire || undefined,
      categorie: transactionFormData.categorie || undefined,
    };

    try {
      if (isRemoteBank()) {
        if (editingTransaction) {
          await bankApi.updateTransaction(editingTransaction.id, txPayload);
          toast.success('Transaction modifiée avec succès');
        } else {
          await bankApi.createTransaction(txPayload);
          toast.success('Transaction ajoutée avec succès');
        }
        await reloadBankState();
      } else if (editingTransaction) {
        const updatedTransactions = transactions.map((t) =>
          t.id === editingTransaction.id
            ? { ...transactionFormData, id: editingTransaction.id, montant, date: dateStr }
            : t,
        );
        saveTransactions(updatedTransactions);
        syncBalancesFromTransactions(updatedTransactions);
        toast.success('Transaction modifiée avec succès');
      } else {
        const newTransaction: BankTransaction = {
          ...transactionFormData,
          id: Date.now().toString(),
          montant,
          date: dateStr,
        };
        const nextTransactions = [...transactions, newTransaction];
        saveTransactions(nextTransactions);
        syncBalancesFromTransactions(nextTransactions);
        toast.success('Transaction ajoutée avec succès');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur enregistrement transaction');
      return;
    }

    setIsTransactionDialogOpen(false);
    resetTransactionForm();
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce compte ?')) return;
    const accountTransactions = transactions.filter((t) => t.compteId === id);
    if (accountTransactions.length > 0) {
      toast.error('Impossible de supprimer un compte avec des transactions');
      return;
    }
    try {
      if (isRemoteBank()) {
        await bankApi.deleteAccount(id);
        await reloadBankState();
      } else {
        saveAccounts(accounts.filter((acc) => acc.id !== id));
      }
      toast.success('Compte supprimé avec succès');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur suppression compte');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) return;
    try {
      if (isRemoteBank()) {
        await bankApi.deleteTransaction(id);
        await reloadBankState();
      } else {
        const nextTransactions = transactions.filter((t) => t.id !== id);
        saveTransactions(nextTransactions);
        syncBalancesFromTransactions(nextTransactions);
      }
      toast.success('Transaction supprimée avec succès');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur suppression transaction');
    }
  };

  const handleEditAccount = (account: BankAccount) => {
    setEditingAccount(account);
    setAccountFormData({
      nom: account.nom,
      numeroCompte: account.numeroCompte,
      banque: account.banque,
      type: account.type,
      soldeInitial: account.soldeInitial,
      devise: account.devise,
      iban: account.iban || '',
      swift: account.swift || '',
      notes: account.notes || '',
    });
    setIsAccountDialogOpen(true);
  };

  const handleEditTransaction = (transaction: BankTransaction) => {
    setEditingTransaction(transaction);
    setTransactionFormData({
      compteId: transaction.compteId,
      type: transaction.type,
      montant: transaction.montant,
      date: transaction.date,
      description: transaction.description,
      reference: transaction.reference || '',
      beneficiaire: transaction.beneficiaire || '',
      categorie: transaction.categorie || '',
    });
    setIsTransactionDialogOpen(true);
  };

  // Filtrer les transactions
  const filteredTransactions = transactions.filter(transaction => {
    if (selectedAccount !== 'all' && transaction.compteId !== selectedAccount) return false;
    if (filterType !== 'all' && transaction.type !== filterType) return false;
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  // Calculer les totaux
  const totalDepots = filteredTransactions
    .filter(t => t.type === 'depot' || t.type === 'virement')
    .reduce((sum, t) => sum + t.montant, 0);
  const totalRetraits = filteredTransactions
    .filter(t => t.type === 'retrait' || t.type === 'prelevement' || t.type === 'frais')
    .reduce((sum, t) => sum + t.montant, 0);
  const soldeTotal = accounts.reduce((sum, acc) => sum + acc.soldeActuel, 0);

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Transactions Bancaires',
      fileName: `transactions_bancaires_${new Date().toISOString().split('T')[0]}.xlsx`,
      columns: [
        { header: 'Date', value: (t) => new Date(t.date).toLocaleDateString('fr-FR') },
        { header: 'Compte', value: (t) => {
          const account = accounts.find(a => a.id === t.compteId);
          return account?.nom || '-';
        }},
        { header: 'Type', value: (t) => t.type },
        { header: 'Montant (FCFA)', value: (t) => t.montant },
        { header: 'Description', value: (t) => t.description },
        { header: 'Référence', value: (t) => t.reference || '-' },
        { header: 'Bénéficiaire', value: (t) => t.beneficiaire || '-' },
      ],
      rows: filteredTransactions,
    });
  };

  const handleExportPDF = () => {
    // Calculer les totaux
    const totalDepots = filteredTransactions
      .filter(t => isBankCreditType(t.type))
      .reduce((sum, t) => sum + t.montant, 0);
    const totalRetraitsExport = filteredTransactions.filter(t => t.type === 'retrait' || t.type === 'prelevement' || t.type === 'frais').reduce((sum, t) => sum + t.montant, 0);
    const soldeNet = totalDepots - totalRetraitsExport;

    exportToPrintablePDF({
      title: 'Transactions Bancaires',
      fileName: `transactions_bancaires_${new Date().toISOString().split('T')[0]}.pdf`,
      // Couleurs thématiques pour la banque (ambre/jaune)
      headerColor: '#d97706',
      headerTextColor: '#ffffff',
      evenRowColor: '#fffbeb',
      oddRowColor: '#ffffff',
      accentColor: '#d97706',
      totals: [
        { label: 'Nombre de transactions', value: filteredTransactions.length, style: 'neutral', icon: EMOJI.liste },
        { label: 'Total Dépôts', value: `+${totalDepots.toLocaleString('fr-FR')} FCFA`, style: 'positive', icon: EMOJI.entree },
        { label: 'Total Retraits/Frais', value: `-${totalRetraitsExport.toLocaleString('fr-FR')} FCFA`, style: 'negative', icon: EMOJI.sortie },
        { label: 'Solde Net', value: `${soldeNet >= 0 ? '+' : ''}${soldeNet.toLocaleString('fr-FR')} FCFA`, style: soldeNet >= 0 ? 'positive' : 'negative', icon: EMOJI.argent },
      ],
      columns: [
        { header: 'Date', value: (t) => `${EMOJI.date} ${new Date(t.date).toLocaleDateString('fr-FR')}` },
        { header: 'Compte', value: (t) => {
          const account = accounts.find(a => a.id === t.compteId);
          return account ? `🏦 ${account.nom}` : '-';
        }},
        { 
          header: 'Type', 
          value: (t) => {
            const types: Record<string, string> = {
              'depot': `${EMOJI.entree} Dépôt`,
              'retrait': `${EMOJI.sortie} Retrait`,
              'virement': `${EMOJI.virement} Virement`,
              'prelevement': `${EMOJI.sortie} Prélèvement`,
              'frais': `${EMOJI.frais} Frais`,
            };
            return types[t.type] || t.type;
          },
          cellStyle: (t) =>
            isBankCreditType(t.type)
              ? 'positive'
              : isBankDebitType(t.type)
                ? 'negative'
                : 'neutral',
        },
        { 
          header: 'Montant (FCFA)', 
          value: (t) => {
            const isCredit = isBankCreditType(t.type);
            return isCredit ? `+${t.montant.toLocaleString('fr-FR')}` : `-${t.montant.toLocaleString('fr-FR')}`;
          },
          cellStyle: (t) => (isBankCreditType(t.type) ? 'positive' : 'negative'),
        },
        { header: 'Description', value: (t) => t.description },
        { header: 'Référence', value: (t) => t.reference || '-' },
        { header: 'Bénéficiaire', value: (t) => t.beneficiaire || '-' },
      ],
      rows: filteredTransactions,
    });
  };

  return (
    <div className="space-y-6 p-1">
      {!bankReady && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
          <p className="text-sm">Chargement des comptes et mouvements…</p>
        </div>
      )}
      {bankReady && (
        <>
      <PageHeader
        title="Gestion Bancaire"
        description="Gérez vos comptes bancaires et transactions"
        icon={Landmark}
        gradient="from-amber-500/20 via-yellow-500/10 to-transparent"
        actions={
          <div className="flex gap-2">
            {canManageAccounting && (
            <Dialog open={isAccountDialogOpen} onOpenChange={(open) => { setIsAccountDialogOpen(open); if (!open) resetAccountForm(); }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau compte
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAccount ? 'Modifier le compte' : 'Nouveau compte bancaire'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAccountSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nom">Nom du compte *</Label>
                      <Input
                        id="nom"
                        value={accountFormData.nom}
                        onChange={(e) => setAccountFormData({ ...accountFormData, nom: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="numeroCompte">Numéro de compte *</Label>
                      <Input
                        id="numeroCompte"
                        value={accountFormData.numeroCompte}
                        onChange={(e) => setAccountFormData({ ...accountFormData, numeroCompte: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="banque">Banque *</Label>
                      <Input
                        id="banque"
                        value={accountFormData.banque}
                        onChange={(e) => setAccountFormData({ ...accountFormData, banque: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="type">Type de compte *</Label>
                      <Select value={accountFormData.type} onValueChange={(value: any) => setAccountFormData({ ...accountFormData, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="courant">Compte courant</SelectItem>
                          <SelectItem value="epargne">Compte épargne</SelectItem>
                          <SelectItem value="professionnel">Compte professionnel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="soldeInitial">Solde initial (FCFA)</Label>
                      <Input
                        id="soldeInitial"
                        type="number"
                        value={accountFormData.soldeInitial}
                        onChange={(e) => setAccountFormData({ ...accountFormData, soldeInitial: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="devise">Devise</Label>
                      <Select value={accountFormData.devise} onValueChange={(value) => setAccountFormData({ ...accountFormData, devise: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FCFA">FCFA</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="iban">IBAN (optionnel)</Label>
                      <Input
                        id="iban"
                        value={accountFormData.iban}
                        onChange={(e) => setAccountFormData({ ...accountFormData, iban: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="swift">SWIFT/BIC (optionnel)</Label>
                      <Input
                        id="swift"
                        value={accountFormData.swift}
                        onChange={(e) => setAccountFormData({ ...accountFormData, swift: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={accountFormData.notes}
                      onChange={(e) => setAccountFormData({ ...accountFormData, notes: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsAccountDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingAccount ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
            {canManageAccounting && (
            <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => { setIsTransactionDialogOpen(open); if (!open) resetTransactionForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Nouvelle transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleTransactionSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="compteId">Compte *</Label>
                      <Select value={transactionFormData.compteId} onValueChange={(value) => setTransactionFormData({ ...transactionFormData, compteId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un compte" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.nom} - {account.banque}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type">Type *</Label>
                      <Select value={transactionFormData.type} onValueChange={(value: any) => setTransactionFormData({ ...transactionFormData, type: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="depot">Dépôt</SelectItem>
                          <SelectItem value="retrait">Retrait</SelectItem>
                          <SelectItem value="virement">Virement</SelectItem>
                          <SelectItem value="prelevement">Prélèvement</SelectItem>
                          <SelectItem value="frais">Frais</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="montant">Montant (FCFA) *</Label>
                      <Input
                        id="montant"
                        type="number"
                        value={transactionFormData.montant}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, montant: parseFloat(e.target.value) || 0 })}
                        required
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={transactionFormData.date}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description *</Label>
                    <Input
                      id="description"
                      value={transactionFormData.description}
                      onChange={(e) => setTransactionFormData({ ...transactionFormData, description: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="reference">Référence</Label>
                      <Input
                        id="reference"
                        value={transactionFormData.reference}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, reference: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="beneficiaire">Bénéficiaire</Label>
                      <Input
                        id="beneficiaire"
                        value={transactionFormData.beneficiaire}
                        onChange={(e) => setTransactionFormData({ ...transactionFormData, beneficiaire: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button type="submit">
                      {editingTransaction ? 'Modifier' : 'Ajouter'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            )}
            <Button variant="outline" onClick={handleExportExcel}>
              <FileDown className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        }
      />

      {/* Statistiques */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Comptes bancaires</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {soldeTotal.toLocaleString('fr-FR')} FCFA
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total dépôts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalDepots.toLocaleString('fr-FR')} FCFA
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total retraits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalRetraits.toLocaleString('fr-FR')} FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des comptes */}
      <Card>
        <CardHeader>
          <CardTitle>Comptes bancaires</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Landmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun compte bancaire enregistré</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {accounts.map(account => (
                <Card key={account.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{account.nom}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{account.banque}</p>
                      </div>
                      <Badge variant="secondary">{account.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">N° compte:</span>
                      <span className="font-mono">{account.numeroCompte}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Solde:</span>
                      <span className={`font-bold ${account.soldeActuel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {account.soldeActuel.toLocaleString('fr-FR')} {account.devise}
                      </span>
                    </div>
                    {account.iban && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>IBAN:</span>
                        <span className="font-mono">{account.iban}</span>
                      </div>
                    )}
                    {canManageAccounting && (
                    <div className="flex gap-2 pt-2">
                      {canManageAccounting && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAccount(account)}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      )}
                      {canManageAccounting && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteAccount(account.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      )}
                    </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtres et transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transactions</CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tous les comptes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les comptes</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="depot">Dépôt</SelectItem>
                <SelectItem value="retrait">Retrait</SelectItem>
                <SelectItem value="virement">Virement</SelectItem>
                <SelectItem value="prelevement">Prélèvement</SelectItem>
                <SelectItem value="frais">Frais</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Compte</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Référence</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucune transaction trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map(transaction => {
                    const account = accounts.find(a => a.id === transaction.compteId);
                    const isCredit = isBankCreditType(transaction.type);
                    return (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.date).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell>{account?.nom || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={isCredit ? 'default' : 'secondary'}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={isCredit ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {isCredit ? '+' : '-'}{transaction.montant.toLocaleString('fr-FR')} FCFA
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell className="font-mono text-xs">{transaction.reference || '-'}</TableCell>
                        <TableCell className="text-right">
                          {canManageAccounting && (
                          <div className="flex justify-end gap-2">
                            {canManageAccounting && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditTransaction(transaction)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            )}
                            {canManageAccounting && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            )}
                          </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
