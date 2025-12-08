import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { NumberInput } from '@/components/ui/number-input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit, Wallet, Search, X, FileDown, FileText, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';

export interface CaisseEntry {
  id: string;
  numeroPiece: string;
  date: string;
  designation: string;
  recettes: number;
  depenses: number;
}

export default function Caisse() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<CaisseEntry[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CaisseEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [formData, setFormData] = useState({
    numeroPiece: '',
    date: new Date().toISOString().split('T')[0],
    designation: '',
    recettes: 0,
    depenses: 0,
  });

  const resetForm = () => {
    setFormData({
      numeroPiece: '',
      date: new Date().toISOString().split('T')[0],
      designation: '',
      recettes: 0,
      depenses: 0,
    });
    setEditingEntry(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.numeroPiece.trim()) {
      toast.error('Le numéro de pièce est obligatoire');
      return;
    }

    if (!formData.designation.trim()) {
      toast.error('La désignation est obligatoire');
      return;
    }

    if (formData.recettes < 0 || formData.depenses < 0) {
      toast.error('Les montants ne peuvent pas être négatifs');
      return;
    }

    if (formData.recettes > 0 && formData.depenses > 0) {
      toast.error('Une ligne ne peut avoir qu\'une recette OU une dépense, pas les deux');
      return;
    }

    if (formData.recettes === 0 && formData.depenses === 0) {
      toast.error('Vous devez saisir soit une recette, soit une dépense');
      return;
    }

    // Vérifier l'unicité du numéro de pièce (sauf si on modifie)
    if (editingEntry) {
      const duplicate = entries.find(e => e.numeroPiece === formData.numeroPiece && e.id !== editingEntry.id);
      if (duplicate) {
        toast.error('Ce numéro de pièce existe déjà');
        return;
      }
    } else {
      const duplicate = entries.find(e => e.numeroPiece === formData.numeroPiece);
      if (duplicate) {
        toast.error('Ce numéro de pièce existe déjà');
        return;
      }
    }

    if (editingEntry) {
      setEntries(entries.map(e => 
        e.id === editingEntry.id 
          ? { ...formData, id: editingEntry.id }
          : e
      ));
      toast.success('Ligne modifiée avec succès');
    } else {
      const newEntry: CaisseEntry = {
        id: Date.now().toString(),
        ...formData,
      };
      setEntries([...entries, newEntry]);
      toast.success('Ligne ajoutée avec succès');
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (entry: CaisseEntry) => {
    setEditingEntry(entry);
    setFormData({
      numeroPiece: entry.numeroPiece,
      date: entry.date,
      designation: entry.designation,
      recettes: entry.recettes,
      depenses: entry.depenses,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer la ligne ${entry.numeroPiece} ?`)) {
      setEntries(entries.filter(e => e.id !== id));
      toast.success('Ligne supprimée');
    }
  };

  // Trier les entrées par date puis par numéro de pièce
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.numeroPiece.localeCompare(b.numeroPiece);
    });
  }, [entries]);

  // Calculer le solde progressif
  const entriesWithBalance = useMemo(() => {
    let solde = 0;
    return sortedEntries.map(entry => {
      solde = solde + entry.recettes - entry.depenses;
      return { ...entry, solde };
    });
  }, [sortedEntries]);

  // Filtrer les entrées
  const filteredEntries = useMemo(() => {
    return entriesWithBalance.filter(entry => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          entry.numeroPiece.toLowerCase().includes(search) ||
          entry.designation.toLowerCase().includes(search)
        );
      }
      if (filterDateFrom && entry.date < filterDateFrom) return false;
      if (filterDateTo && entry.date > filterDateTo) return false;
      return true;
    });
  }, [entriesWithBalance, searchTerm, filterDateFrom, filterDateTo]);

  // Calculer les statistiques
  const totalRecettes = filteredEntries.reduce((sum, e) => sum + e.recettes, 0);
  const totalDepenses = filteredEntries.reduce((sum, e) => sum + e.depenses, 0);
  const soldeFinal = filteredEntries.length > 0 ? filteredEntries[filteredEntries.length - 1].solde : 0;

  const getFiltersDescription = () => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Recherche: "${searchTerm}"`);
    if (filterDateFrom) filters.push(`Date du: ${new Date(filterDateFrom).toLocaleDateString('fr-FR')}`);
    if (filterDateTo) filters.push(`Date au: ${new Date(filterDateTo).toLocaleDateString('fr-FR')}`);
    return filters.length > 0 ? `Filtres appliqués: ${filters.join(', ')}` : undefined;
  };

  const handleExportExcel = () => {
    exportToExcel({
      title: 'Journal de Caisse',
      fileName: `caisse_${new Date().toISOString().split('T')[0]}.xlsx`,
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Numéro Pièce', value: (e) => e.numeroPiece },
        { header: 'Date', value: (e) => new Date(e.date).toLocaleDateString('fr-FR') },
        { header: 'Désignation', value: (e) => e.designation },
        { header: 'Recettes', value: (e) => e.recettes > 0 ? e.recettes.toLocaleString('fr-FR') : '-' },
        { header: 'Dépenses', value: (e) => e.depenses > 0 ? e.depenses.toLocaleString('fr-FR') : '-' },
        { header: 'Solde', value: (e) => e.solde.toLocaleString('fr-FR') },
      ],
      rows: filteredEntries,
    });
    toast.success('Export Excel généré avec succès');
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: 'Journal de Caisse',
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Numéro Pièce', value: (e) => e.numeroPiece },
        { header: 'Date', value: (e) => new Date(e.date).toLocaleDateString('fr-FR') },
        { header: 'Désignation', value: (e) => e.designation },
        { header: 'Recettes', value: (e) => e.recettes > 0 ? e.recettes.toLocaleString('fr-FR') : '-' },
        { header: 'Dépenses', value: (e) => e.depenses > 0 ? e.depenses.toLocaleString('fr-FR') : '-' },
        { header: 'Solde', value: (e) => e.solde.toLocaleString('fr-FR') },
      ],
      rows: filteredEntries,
    });
  };

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Journal de Caisse"
        description="Gérez les entrées et sorties de caisse avec suivi du solde"
        icon={Wallet}
        gradient="from-green-500/20 via-emerald-500/10 to-transparent"
        stats={[
          {
            label: 'Total Recettes',
            value: totalRecettes.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
            icon: <TrendingUp className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'Total Dépenses',
            value: totalDepenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
            icon: <TrendingDown className="h-4 w-4" />,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            label: 'Solde Final',
            value: soldeFinal.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
            icon: <Wallet className="h-4 w-4" />,
            color: soldeFinal >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
          },
          {
            label: 'Total Lignes',
            value: filteredEntries.length,
            icon: <Wallet className="h-4 w-4" />,
            color: 'text-purple-600 dark:text-purple-400'
          }
        ]}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/depenses')} 
              className="shadow-md hover:shadow-lg transition-all duration-300 bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/50"
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Dépenses
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="shadow-md hover:shadow-lg transition-all duration-300">
              <FileDown className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="shadow-md hover:shadow-lg transition-all duration-300">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsDialogOpen(true)} className="shadow-md hover:shadow-lg transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une ligne
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEntry ? 'Modifier la ligne' : 'Ajouter une ligne'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="numeroPiece">Numéro de pièce *</Label>
                      <Input
                        id="numeroPiece"
                        value={formData.numeroPiece}
                        onChange={(e) => setFormData({ ...formData, numeroPiece: e.target.value })}
                        placeholder="Ex: PIECE-001"
                        required
                      />
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
                  </div>

                  <div>
                    <Label htmlFor="designation">Désignation *</Label>
                    <Textarea
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="Description de l'opération..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="recettes">Recettes (FCFA)</Label>
                      <NumberInput
                        id="recettes"
                        value={formData.recettes}
                        onChange={(value) => {
                          const recettes = value || 0;
                          setFormData({ ...formData, recettes, depenses: recettes > 0 ? 0 : formData.depenses });
                        }}
                        placeholder="0"
                        min={0}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Saisir uniquement si c'est une recette</p>
                    </div>
                    <div>
                      <Label htmlFor="depenses">Dépenses (FCFA)</Label>
                      <NumberInput
                        id="depenses"
                        value={formData.depenses}
                        onChange={(value) => {
                          const depenses = value || 0;
                          setFormData({ ...formData, depenses, recettes: depenses > 0 ? 0 : formData.recettes });
                        }}
                        placeholder="0"
                        min={0}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Saisir uniquement si c'est une dépense</p>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note :</strong> Une ligne ne peut avoir qu'une recette OU une dépense. 
                      Si vous saisissez une recette, la dépense sera automatiquement mise à 0, et vice versa.
                    </p>
                  </div>

                  <Button type="submit" className="w-full">
                    {editingEntry ? 'Modifier' : 'Ajouter'}
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
              Filtres de recherche
            </CardTitle>
            {(searchTerm || filterDateFrom || filterDateTo) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                }}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="search" className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Recherche
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Rechercher par numéro de pièce ou désignation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateFrom" className="text-sm font-medium text-muted-foreground mb-2">Date du</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateTo" className="text-sm font-medium text-muted-foreground mb-2">Date au</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Journal de Caisse</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm || filterDateFrom || filterDateTo
                  ? 'Aucune ligne ne correspond à votre recherche'
                  : 'Aucune ligne enregistrée'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro Pièce</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Désignation</TableHead>
                    <TableHead className="text-right">Recettes</TableHead>
                    <TableHead className="text-right">Dépenses</TableHead>
                    <TableHead className="text-right">Solde</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium font-mono">{entry.numeroPiece}</TableCell>
                      <TableCell>{new Date(entry.date).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell className="max-w-xs">{entry.designation}</TableCell>
                      <TableCell className="text-right">
                        {entry.recettes > 0 ? (
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {entry.recettes.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.depenses > 0 ? (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            {entry.depenses.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-bold ${entry.solde >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                          {entry.solde.toLocaleString('fr-FR')} FCFA
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

