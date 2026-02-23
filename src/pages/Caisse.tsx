import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Wallet, TrendingUp, TrendingDown, Search, FileDown, FileText, HardDrive, Upload } from 'lucide-react';
import { useRef } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';
import { EMOJI } from '@/lib/emoji-palette';

const CAISSE_STORAGE_KEY = 'caisse_transactions';

export interface CaisseTransaction {
  id: string;
  type: 'entree' | 'sortie';
  montant: number;
  date: string;
  description: string;
  categorie?: string;
  reference?: string;
}

export default function Caisse() {
  const { canCreate, canModifyFinancial, canDeleteFinancial } = useAuth();
  const restoreFileRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<CaisseTransaction[]>(() => {
    const saved = localStorage.getItem(CAISSE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const [soldeInitial, setSoldeInitial] = useState(() => {
    const saved = localStorage.getItem('caisse_solde_initial');
    return saved ? parseFloat(saved) : 0;
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<CaisseTransaction | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    type: 'entree' as 'entree' | 'sortie',
    montant: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    categorie: '',
    reference: '',
  });

  const saveTransactions = (newTransactions: CaisseTransaction[]) => {
    setTransactions(newTransactions);
    localStorage.setItem(CAISSE_STORAGE_KEY, JSON.stringify(newTransactions));
  };

  const saveSoldeInitial = (value: number) => {
    setSoldeInitial(value);
    localStorage.setItem('caisse_solde_initial', String(value));
  };

  const soldeActuel = soldeInitial + transactions.reduce((sum, t) => {
    return t.type === 'entree' ? sum + t.montant : sum - t.montant;
  }, 0);

  const totalEntrees = transactions.filter(t => t.type === 'entree').reduce((sum, t) => sum + t.montant, 0);
  const totalSorties = transactions.filter(t => t.type === 'sortie').reduce((sum, t) => sum + t.montant, 0);

  const resetForm = () => {
    setFormData({
      type: 'entree',
      montant: 0,
      date: new Date().toISOString().split('T')[0],
      description: '',
      categorie: '',
      reference: '',
    });
    setEditingTransaction(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTransaction) {
      const updated = transactions.map(t =>
        t.id === editingTransaction.id ? { ...formData, id: t.id } : t
      );
      saveTransactions(updated);
      toast.success('Transaction modifiée avec succès');
    } else {
      const newTransaction: CaisseTransaction = {
        ...formData,
        id: Date.now().toString(),
      };
      saveTransactions([...transactions, newTransaction]);
      toast.success('Transaction ajoutée avec succès');
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette transaction ?')) {
      saveTransactions(transactions.filter(t => t.id !== id));
      toast.success('Transaction supprimée');
    }
  };

  const handleEdit = (t: CaisseTransaction) => {
    setEditingTransaction(t);
    setFormData({
      type: t.type,
      montant: t.montant,
      date: t.date.split('T')[0] || t.date,
      description: t.description,
      categorie: t.categorie || '',
      reference: t.reference || '',
    });
    setIsDialogOpen(true);
  };

  const handleBackupCaisse = () => {
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      caisse: {
        soldeInitial,
        transactions,
      },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const filename = `caisse-backup-${new Date().toISOString().split('T')[0]}.json`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Backup caisse téléchargé : ${filename}`);
  };

  const handleRestoreCaisse = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error('Fichier invalide : sélectionnez un fichier .json');
      e.target.value = '';
      return;
    }

    if (!confirm(
      '⚠️ ATTENTION : La restauration va remplacer toutes les transactions de caisse actuelles.\n\nContinuer ?'
    )) {
      e.target.value = '';
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      if (!parsed.caisse || parsed.caisse.transactions === undefined) {
        throw new Error('Fichier de backup invalide ou incompatible');
      }

      const { soldeInitial: savedSolde, transactions: savedTx } = parsed.caisse;
      saveTransactions(savedTx ?? []);
      saveSoldeInitial(savedSolde ?? 0);
      toast.success(`Caisse restaurée : ${savedTx?.length ?? 0} transaction(s) importée(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la restauration');
    } finally {
      e.target.value = '';
    }
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !t.reference?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Mouvements de Caisse',
      fileName: `caisse_${new Date().toISOString().split('T')[0]}.xlsx`,
      columns: [
        { header: 'Date', value: (t) => new Date(t.date).toLocaleDateString('fr-FR') },
        { header: 'Type', value: (t) => t.type === 'entree' ? 'Entrée' : 'Sortie' },
        { header: 'Montant (FCFA)', value: (t) => t.montant },
        { header: 'Description', value: (t) => t.description },
        { header: 'Catégorie', value: (t) => t.categorie || '-' },
        { header: 'Référence', value: (t) => t.reference || '-' },
      ],
      rows: filteredTransactions,
    });
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: 'Mouvements de Caisse',
      fileName: `caisse_${new Date().toISOString().split('T')[0]}.pdf`,
      headerColor: '#059669',
      headerTextColor: '#ffffff',
      evenRowColor: '#ecfdf5',
      oddRowColor: '#ffffff',
      accentColor: '#059669',
      totals: [
        { label: 'Solde initial', value: `${soldeInitial.toLocaleString('fr-FR')} FCFA`, style: 'neutral', icon: EMOJI.argent },
        { label: 'Total entrées', value: `+${totalEntrees.toLocaleString('fr-FR')} FCFA`, style: 'positive', icon: EMOJI.entree },
        { label: 'Total sorties', value: `-${totalSorties.toLocaleString('fr-FR')} FCFA`, style: 'negative', icon: EMOJI.sortie },
      ],
      columns: [
        { header: 'Date', value: (t) => `${EMOJI.date} ${new Date(t.date).toLocaleDateString('fr-FR')}` },
        { header: 'Type', value: (t) => t.type === 'entree' ? `${EMOJI.entree} Entrée` : `${EMOJI.sortie} Sortie`, cellStyle: (t) => t.type === 'entree' ? 'positive' : 'negative' },
        { header: 'Description', value: (t) => t.description },
        { header: 'Référence', value: (t) => t.reference || '-' },
      ],
      rows: filteredTransactions,
    });
  };

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Caisse"
        description="Gérez les entrées et sorties de caisse"
        icon={Wallet}
        gradient="from-green-500/20 via-emerald-500/10 to-transparent"
        actions={
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleBackupCaisse} className="gap-2">
              <HardDrive className="h-4 w-4" />
              Backup
            </Button>
            <Button variant="outline" size="sm" onClick={() => restoreFileRef.current?.click()} className="gap-2">
              <Upload className="h-4 w-4" />
              Restaurer
            </Button>
            <input
              ref={restoreFileRef}
              type="file"
              accept=".json"
              aria-label="Sélectionner un fichier de backup caisse JSON"
              className="hidden"
              onChange={handleRestoreCaisse}
            />
            {canCreate && (
              <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle transaction
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTransaction ? 'Modifier la transaction' : 'Nouvelle transaction'}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Type *</Label>
                        <Select value={formData.type} onValueChange={(v: 'entree' | 'sortie') => setFormData({ ...formData, type: v })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="entree">Entrée</SelectItem>
                            <SelectItem value="sortie">Sortie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="montant">Montant (FCFA) *</Label>
                        <Input
                          id="montant"
                          type="number"
                          value={formData.montant || ''}
                          onChange={(e) => setFormData({ ...formData, montant: parseFloat(e.target.value) || 0 })}
                          required
                          min="0"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="date">Date *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description *</Label>
                      <Input
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="categorie">Catégorie</Label>
                        <Input
                          id="categorie"
                          value={formData.categorie}
                          onChange={(e) => setFormData({ ...formData, categorie: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="reference">Référence</Label>
                        <Input
                          id="reference"
                          value={formData.reference}
                          onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                      <Button type="submit">{editingTransaction ? 'Modifier' : 'Ajouter'}</Button>
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
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Solde actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${soldeActuel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {soldeActuel.toLocaleString('fr-FR')} FCFA
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Total entrées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalEntrees.toLocaleString('fr-FR')} FCFA
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Total sorties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalSorties.toLocaleString('fr-FR')} FCFA
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Solde initial — modifiable par admin/comptable uniquement */}
      {canModifyFinancial && (
        <div className="flex items-center gap-3 px-1">
          <span className="text-sm text-muted-foreground">Solde initial :</span>
          <Input
            type="number"
            value={soldeInitial}
            onChange={(e) => saveSoldeInitial(parseFloat(e.target.value) || 0)}
            className="w-40 h-8 text-sm"
          />
          <span className="text-sm text-muted-foreground">FCFA</span>
        </div>
      )}

      {/* Liste des transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Mouvements de caisse</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tous les types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  <SelectItem value="entree">Entrées</SelectItem>
                  <SelectItem value="sortie">Sorties</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Référence</TableHead>
                  {(canModifyFinancial || canDeleteFinancial) && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Aucune transaction enregistrée</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{new Date(t.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'entree' ? 'default' : 'secondary'}>
                          {t.type === 'entree' ? 'Entrée' : 'Sortie'}
                        </Badge>
                      </TableCell>
                      <TableCell className={t.type === 'entree' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {t.type === 'entree' ? '+' : '-'}{t.montant.toLocaleString('fr-FR')} FCFA
                      </TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell className="font-mono text-xs">{t.reference || '-'}</TableCell>
                      {(canModifyFinancial || canDeleteFinancial) && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canModifyFinancial && (
                              <Button variant="outline" size="sm" onClick={() => handleEdit(t)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteFinancial && (
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(t.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
