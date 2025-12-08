import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit, Landmark, Search, X, FileDown, FileText, DollarSign, TrendingUp, TrendingDown, History } from 'lucide-react';
import { NumberInput } from '@/components/ui/number-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';

export interface BankTransaction {
  id: string;
  type: 'credit' | 'debit';
  montant: number;
  date: string;
  description: string;
  reference?: string;
}

export interface Bank {
  id: string;
  nom: string;
  code: string;
  telephone?: string;
  email?: string;
  adresse?: string;
  comptePrincipal?: string;
  notes?: string;
  soldeInitial?: number; // Solde initial du compte
  transactions?: BankTransaction[]; // Historique des transactions
}

// Données initiales de banques camerounaises
const initialBanks: Bank[] = [
  {
    id: '1',
    nom: 'Afriland First Bank',
    code: 'AFB',
    telephone: '+237 2 33 42 11 11',
    email: 'contact@afrilandfirstbank.com',
    adresse: 'Douala, Boulevard de la République',
    comptePrincipal: '123456789012345',
    soldeInitial: 5000000,
    transactions: [],
  },
  {
    id: '2',
    nom: 'Société Générale Cameroun',
    code: 'SGC',
    telephone: '+237 2 33 42 20 00',
    email: 'contact@socgen.cm',
    adresse: 'Yaoundé, Avenue Kennedy',
    comptePrincipal: '987654321098765',
    soldeInitial: 3000000,
    transactions: [],
  },
  {
    id: '3',
    nom: 'UBA Cameroun',
    code: 'UBA',
    telephone: '+237 2 33 42 30 00',
    email: 'info@ubagroup.com',
    adresse: 'Douala, Akwa',
    comptePrincipal: '555555555555555',
    soldeInitial: 2000000,
    transactions: [],
  },
];

export default function Bank() {
  const [banks, setBanks] = useState<Bank[]>(initialBanks);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isSoldeDialogOpen, setIsSoldeDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [editingBank, setEditingBank] = useState<Bank | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    telephone: '',
    email: '',
    adresse: '',
    comptePrincipal: '',
    notes: '',
    soldeInitial: 0,
  });

  const [transactionData, setTransactionData] = useState({
    type: 'credit' as 'credit' | 'debit',
    montant: 0,
    description: '',
    reference: '',
  });

  const resetForm = () => {
    setFormData({
      nom: '',
      code: '',
      telephone: '',
      email: '',
      adresse: '',
      comptePrincipal: '',
      notes: '',
      soldeInitial: 0,
    });
    setEditingBank(null);
  };

  const resetTransactionForm = () => {
    setTransactionData({
      type: 'credit',
      montant: 0,
      description: '',
      reference: '',
    });
    setSelectedBank(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nom.trim()) {
      toast.error('Le nom de la banque est obligatoire');
      return;
    }

    if (editingBank) {
      setBanks(banks.map(b => 
        b.id === editingBank.id 
          ? { ...formData, id: editingBank.id, transactions: b.transactions || [] }
          : b
      ));
      toast.success('Banque modifiée avec succès');
    } else {
      const newBank: Bank = {
        id: Date.now().toString(),
        ...formData,
        transactions: [],
      };
      setBanks([...banks, newBank]);
      toast.success('Banque ajoutée avec succès');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (bank: Bank) => {
    setEditingBank(bank);
    setFormData({
      nom: bank.nom,
      code: bank.code || '',
      telephone: bank.telephone || '',
      email: bank.email || '',
      adresse: bank.adresse || '',
      comptePrincipal: bank.comptePrincipal || '',
      notes: bank.notes || '',
      soldeInitial: bank.soldeInitial || 0,
    });
    setIsDialogOpen(true);
  };

  const calculateSolde = (bank: Bank): number => {
    const soldeInitial = bank.soldeInitial || 0;
    const transactions = bank.transactions || [];
    const totalCredits = transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.montant, 0);
    const totalDebits = transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.montant, 0);
    return soldeInitial + totalCredits - totalDebits;
  };

  const handleAddTransaction = () => {
    if (!selectedBank) return;

    if (transactionData.montant <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }

    if (!transactionData.description.trim()) {
      toast.error('La description est obligatoire');
      return;
    }

    const newTransaction: BankTransaction = {
      id: Date.now().toString(),
      ...transactionData,
      date: new Date().toISOString(),
    };

    const updatedBank: Bank = {
      ...selectedBank,
      transactions: [...(selectedBank.transactions || []), newTransaction],
    };

    setBanks(banks.map(b => b.id === selectedBank.id ? updatedBank : b));
    toast.success(
      transactionData.type === 'credit' 
        ? `Crédit de ${transactionData.montant.toLocaleString('fr-FR')} FCFA ajouté`
        : `Débit de ${transactionData.montant.toLocaleString('fr-FR')} FCFA ajouté`
    );
    setIsTransactionDialogOpen(false);
    resetTransactionForm();
  };

  const handleSetSoldeInitial = () => {
    if (!selectedBank) return;

    const updatedBank: Bank = {
      ...selectedBank,
      soldeInitial: formData.soldeInitial,
    };

    setBanks(banks.map(b => b.id === selectedBank.id ? updatedBank : b));
    toast.success(`Solde initial de ${formData.soldeInitial.toLocaleString('fr-FR')} FCFA défini`);
    setIsSoldeDialogOpen(false);
    setSelectedBank(null);
  };

  const handleDelete = (id: string) => {
    const bank = banks.find(b => b.id === id);
    if (!bank) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer ${bank.nom} ?`)) {
      setBanks(banks.filter(b => b.id !== id));
      toast.success('Banque supprimée');
    }
  };

  const filteredBanks = banks.filter(bank => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        bank.nom.toLowerCase().includes(search) ||
        (bank.code && bank.code.toLowerCase().includes(search)) ||
        (bank.telephone && bank.telephone.includes(search)) ||
        (bank.email && bank.email.toLowerCase().includes(search)) ||
        (bank.adresse && bank.adresse.toLowerCase().includes(search)) ||
        (bank.comptePrincipal && bank.comptePrincipal.includes(search))
      );
    }
    return true;
  });

  const getFiltersDescription = () => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Recherche: "${searchTerm}"`);
    return filters.length > 0 ? `Filtres appliqués: ${filters.join(', ')}` : undefined;
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Liste des Banques',
      fileName: `banques_${new Date().toISOString().split('T')[0]}.xlsx`,
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Nom', value: (b) => b.nom },
        { header: 'Code', value: (b) => b.code || '-' },
        { header: 'Téléphone', value: (b) => b.telephone || '-' },
        { header: 'Email', value: (b) => b.email || '-' },
        { header: 'Adresse', value: (b) => b.adresse || '-' },
        { header: 'Compte Principal', value: (b) => b.comptePrincipal || '-' },
        { header: 'Notes', value: (b) => b.notes || '-' },
      ],
      rows: filteredBanks,
    });
    toast.success('Export Excel généré avec succès');
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: 'Liste des Banques',
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Nom', value: (b) => b.nom },
        { header: 'Code', value: (b) => b.code || '-' },
        { header: 'Téléphone', value: (b) => b.telephone || '-' },
        { header: 'Email', value: (b) => b.email || '-' },
        { header: 'Adresse', value: (b) => b.adresse || '-' },
        { header: 'Compte Principal', value: (b) => b.comptePrincipal || '-' },
      ],
      rows: filteredBanks,
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      <PageHeader
        title="Gestion des Banques"
        description="Gérez les informations bancaires de votre entreprise"
        icon={Landmark}
        gradient="from-amber-500/20 via-yellow-500/10 to-transparent"
        stats={[
          {
            label: 'Total Banques',
            value: banks.length,
            icon: <Landmark className="h-4 w-4" />,
            color: 'text-amber-600 dark:text-amber-400'
          },
          {
            label: 'Solde Total',
            value: banks.reduce((sum, b) => sum + calculateSolde(b), 0).toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
            icon: <DollarSign className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          }
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={handleExportExcel} 
              className="shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm"
              size="sm"
            >
              <FileDown className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Excel</span>
            </Button>
            <Button 
              variant="outline" 
              onClick={handleExportPDF} 
              className="shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm"
              size="sm"
            >
              <FileText className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">PDF</span>
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button 
                  onClick={() => setIsDialogOpen(true)} 
                  className="shadow-md hover:shadow-lg transition-all duration-300 text-xs sm:text-sm"
                  size="sm"
                >
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Ajouter une banque</span>
                  <span className="sm:hidden">Ajouter</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">{editingBank ? 'Modifier la banque' : 'Ajouter une banque'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  <div>
                    <Label htmlFor="nom">Nom de la banque *</Label>
                    <Input
                      id="nom"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      placeholder="Ex: Afriland First Bank"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label htmlFor="code">Code banque</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="Ex: AFB"
                        className="text-sm sm:text-base"
                      />
                    </div>
                    <div>
                      <Label htmlFor="telephone">Téléphone</Label>
                      <Input
                        id="telephone"
                        value={formData.telephone}
                        onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                        placeholder="+237 6 12 34 56 78"
                        className="text-sm sm:text-base"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@banque.cm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="adresse">Adresse</Label>
                    <Input
                      id="adresse"
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                      placeholder="Adresse complète de la banque"
                    />
                  </div>

                  <div>
                    <Label htmlFor="comptePrincipal">Numéro de compte principal</Label>
                    <Input
                      id="comptePrincipal"
                      value={formData.comptePrincipal}
                      onChange={(e) => setFormData({ ...formData, comptePrincipal: e.target.value })}
                      placeholder="Numéro de compte"
                    />
                  </div>

                  <div>
                    <Label htmlFor="soldeInitial">Solde initial (FCFA)</Label>
                    <NumberInput
                      id="soldeInitial"
                      value={formData.soldeInitial}
                      onChange={(value) => setFormData({ ...formData, soldeInitial: value || 0 })}
                      placeholder="0"
                      min={0}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Solde de départ du compte bancaire
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Informations complémentaires..."
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    {editingBank ? 'Modifier' : 'Ajouter'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Recherche
            </CardTitle>
            {searchTerm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm('')}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, code, téléphone, email, adresse ou compte..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredBanks.length === 0 ? (
          <div className="col-span-full text-center py-8 sm:py-12">
            <Landmark className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground text-sm sm:text-base">
              {searchTerm 
                ? 'Aucune banque ne correspond à votre recherche' 
                : 'Aucune banque enregistrée'}
            </p>
            {!searchTerm && (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="mt-4"
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter votre première banque
              </Button>
            )}
          </div>
        ) : (
          filteredBanks.map((bank) => (
            <Card key={bank.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 group flex flex-col">
              <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3 flex-shrink-0">
                <div className="flex items-start justify-between gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle className="text-base sm:text-lg truncate">{bank.nom}</CardTitle>
                    </div>
                    {bank.code && (
                      <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-xs">
                        {bank.code}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleEdit(bank)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 h-7 w-7 p-0"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDelete(bank.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-2 sm:space-y-3 flex-1">
                  {/* Solde */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-2 sm:p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">Solde actuel</p>
                        <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-700 dark:text-green-400 truncate">
                          {calculateSolde(bank).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 dark:text-green-400 shrink-0" />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    {bank.telephone && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-muted-foreground shrink-0">📞</span>
                        <span className="truncate">{bank.telephone}</span>
                      </div>
                    )}
                    {bank.email && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-muted-foreground shrink-0">✉️</span>
                        <span className="truncate">{bank.email}</span>
                      </div>
                    )}
                    {bank.adresse && (
                      <div className="flex items-start gap-2 text-xs sm:text-sm">
                        <span className="text-muted-foreground shrink-0">📍</span>
                        <span className="flex-1 line-clamp-2">{bank.adresse}</span>
                      </div>
                    )}
                    {bank.comptePrincipal && (
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <span className="text-muted-foreground shrink-0">💳</span>
                        <span className="font-mono truncate text-xs">{bank.comptePrincipal}</span>
                      </div>
                    )}
                    {bank.notes && (
                      <div className="pt-2 border-t border-dashed">
                        <p className="text-xs text-muted-foreground mb-1">Notes:</p>
                        <p className="text-xs sm:text-sm line-clamp-2">{bank.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 sm:pt-3 border-t flex gap-1.5 sm:gap-2 mt-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBank(bank);
                        setIsTransactionDialogOpen(true);
                      }}
                      className="flex-1 text-xs"
                    >
                      <DollarSign className="h-3 w-3 mr-1" />
                      <span className="hidden sm:inline">Transaction</span>
                      <span className="sm:hidden">Trans.</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedBank(bank);
                        setFormData({ ...formData, soldeInitial: bank.soldeInitial || 0 });
                        setIsSoldeDialogOpen(true);
                      }}
                      className="flex-1 text-xs"
                    >
                      <History className="h-3 w-3 mr-1" />
                      Solde
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog pour ajouter une transaction */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => {
        setIsTransactionDialogOpen(open);
        if (!open) resetTransactionForm();
      }}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {transactionData.type === 'credit' ? 'Ajouter un crédit' : 'Ajouter un débit'} - {selectedBank?.nom}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div>
              <Label>Type de transaction</Label>
              <Select
                value={transactionData.type}
                onValueChange={(value) => setTransactionData({ ...transactionData, type: value as 'credit' | 'debit' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      Crédit (Entrée d'argent)
                    </span>
                  </SelectItem>
                  <SelectItem value="debit">
                    <span className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      Débit (Sortie d'argent)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transaction-montant">Montant (FCFA) *</Label>
              <NumberInput
                id="transaction-montant"
                value={transactionData.montant}
                onChange={(value) => setTransactionData({ ...transactionData, montant: value || 0 })}
                placeholder="0"
                min={0}
                required
              />
            </div>

            <div>
              <Label htmlFor="transaction-description">Description *</Label>
              <Textarea
                id="transaction-description"
                value={transactionData.description}
                onChange={(e) => setTransactionData({ ...transactionData, description: e.target.value })}
                placeholder="Ex: Virement client, Paiement facture, etc."
                rows={3}
                required
              />
            </div>

            <div>
              <Label htmlFor="transaction-reference">Référence (optionnel)</Label>
              <Input
                id="transaction-reference"
                value={transactionData.reference}
                onChange={(e) => setTransactionData({ ...transactionData, reference: e.target.value })}
                placeholder="Ex: VIR-2024-001, CHQ-1234"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsTransactionDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAddTransaction}>
                {transactionData.type === 'credit' ? (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Ajouter le crédit
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-2 h-4 w-4" />
                    Ajouter le débit
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour définir le solde initial */}
      <Dialog open={isSoldeDialogOpen} onOpenChange={(open) => {
        setIsSoldeDialogOpen(open);
        if (!open) {
          setSelectedBank(null);
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Définir le solde initial - {selectedBank?.nom}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 sm:space-y-4 py-2 sm:py-4">
            <div>
              <Label htmlFor="solde-initial">Solde initial (FCFA)</Label>
              <NumberInput
                id="solde-initial"
                value={formData.soldeInitial}
                onChange={(value) => setFormData({ ...formData, soldeInitial: value || 0 })}
                placeholder="0"
                min={0}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Le solde actuel sera recalculé en fonction de ce solde initial et des transactions.
              </p>
            </div>

            {selectedBank && (
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Solde actuel calculé:</p>
                <p className="text-lg font-bold">
                  {calculateSolde(selectedBank).toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsSoldeDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSetSoldeInitial}>
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}







