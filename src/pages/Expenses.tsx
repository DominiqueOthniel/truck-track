import { useState } from 'react';
import { useApp, Expense, Invoice } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Filter, DollarSign, TrendingDown, Receipt, FileText, X, Truck, Tag, Search, User, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { syncExpenseWithDriver, removeExpenseFromDriver } from '@/lib/sync-utils';
import PageHeader from '@/components/PageHeader';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';

const categories = ['Carburant', 'Maintenance', 'Péage', 'Assurance', 'Autre'];

export default function Expenses() {
  const { expenses, setExpenses, trucks, drivers, setDrivers, thirdParties, subCategories, setSubCategories, invoices, setInvoices, trips } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [selectedExpenseForInvoice, setSelectedExpenseForInvoice] = useState<Expense | null>(null);
  const [newSubCategory, setNewSubCategory] = useState<string>('');
  const [filterCamion, setFilterCamion] = useState<string>('all');
  const [filterCategorie, setFilterCategorie] = useState<string>('all');
  const [filterSousCategorie, setFilterSousCategorie] = useState<string>('all');
  const [filterFournisseur, setFilterFournisseur] = useState<string>('all');
  const [filterChauffeur, setFilterChauffeur] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterMontantMin, setFilterMontantMin] = useState<string>('');
  const [filterMontantMax, setFilterMontantMax] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [formData, setFormData] = useState({
    camionId: '',
    tripId: '',
    chauffeurId: '',
    categorie: 'Carburant',
    sousCategorie: '',
    fournisseurId: '',
    montant: 0,
    quantite: undefined as number | undefined,
    prixUnitaire: undefined as number | undefined,
    date: '',
    description: '',
  });

  const [invoiceFormData, setInvoiceFormData] = useState({
    tva: 0,
    tps: 0,
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      camionId: '',
      tripId: '',
      chauffeurId: '',
      categorie: 'Carburant',
      sousCategorie: '',
      fournisseurId: '',
      montant: 0,
      quantite: undefined,
      prixUnitaire: undefined,
      date: '',
      description: '',
    });
    setEditingExpense(null);
    setNewSubCategory('');
  };

  const resetInvoiceForm = () => {
    setInvoiceFormData({
      tva: 0,
      tps: 0,
      notes: '',
    });
    setSelectedExpenseForInvoice(null);
  };

  const handleAddSubCategory = () => {
    if (!newSubCategory.trim() || !formData.categorie) return;
    
    const currentSubs = subCategories[formData.categorie] || [];
    if (!currentSubs.includes(newSubCategory.trim())) {
      setSubCategories({
        ...subCategories,
        [formData.categorie]: [...currentSubs, newSubCategory.trim()],
      });
      setFormData({ ...formData, sousCategorie: newSubCategory.trim() });
      setNewSubCategory('');
      toast.success('Sous-catégorie ajoutée');
    } else {
      toast.error('Cette sous-catégorie existe déjà');
    }
  };

  // Fonction pour obtenir l'unité selon la catégorie
  const getUnite = (categorie: string) => {
    switch (categorie) {
      case 'Carburant':
        return 'Litres';
      case 'Maintenance':
        return 'Pièces';
      default:
        return 'Unités';
    }
  };

  // Calcul automatique du montant si quantité et prix unitaire sont fournis
  const calculateMontant = (quantite?: number, prixUnitaire?: number) => {
    if (quantite !== undefined && prixUnitaire !== undefined && quantite > 0 && prixUnitaire > 0) {
      return quantite * prixUnitaire;
    }
    return undefined;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculer le montant si quantité et prix unitaire sont fournis
    let finalMontant = formData.montant;
    if (formData.quantite !== undefined && formData.prixUnitaire !== undefined && 
        formData.quantite > 0 && formData.prixUnitaire > 0) {
      finalMontant = formData.quantite * formData.prixUnitaire;
    }
    
    if (editingExpense) {
      // Lors de la modification, on supprime l'ancienne transaction et on en crée une nouvelle
      if (editingExpense.chauffeurId && editingExpense.chauffeurId !== formData.chauffeurId) {
        removeExpenseFromDriver(editingExpense.id, editingExpense.chauffeurId, drivers, setDrivers);
      }
      
      const updatedExpense: Expense = { 
        ...formData,
        montant: finalMontant,
        id: editingExpense.id,
        tripId: formData.tripId || undefined,
        quantite: formData.quantite || undefined,
        prixUnitaire: formData.prixUnitaire || undefined
      };
      setExpenses(expenses.map(exp => exp.id === editingExpense.id ? updatedExpense : exp));
      
      // Synchroniser avec le nouveau chauffeur si nécessaire
      if (formData.chauffeurId) {
        syncExpenseWithDriver(updatedExpense, drivers, setDrivers);
      }
      
      toast.success('Dépense modifiée et synchronisée');
    } else {
      const newExpense: Expense = { 
        ...formData,
        montant: finalMontant,
        id: Date.now().toString(),
        tripId: formData.tripId || undefined,
        quantite: formData.quantite || undefined,
        prixUnitaire: formData.prixUnitaire || undefined
      };
      setExpenses([...expenses, newExpense]);
      
      // Synchronisation automatique avec le chauffeur
      if (formData.chauffeurId) {
        syncExpenseWithDriver(newExpense, drivers, setDrivers);
      }
      
      toast.success('Dépense ajoutée et synchronisée');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      camionId: expense.camionId,
      tripId: expense.tripId || '',
      chauffeurId: expense.chauffeurId || '',
      categorie: expense.categorie,
      sousCategorie: expense.sousCategorie || '',
      fournisseurId: expense.fournisseurId || '',
      montant: expense.montant,
      quantite: expense.quantite,
      prixUnitaire: expense.prixUnitaire,
      date: expense.date,
      description: expense.description,
    });
    setIsDialogOpen(true);
  };

  const handleCreateInvoice = (expense: Expense) => {
    setSelectedExpenseForInvoice(expense);
    setInvoiceFormData({
      tva: 0,
      tps: 0,
      notes: '',
    });
    setIsInvoiceDialogOpen(true);
  };

  const handleSubmitInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseForInvoice) return;

    const montantHT = selectedExpenseForInvoice.montant;
    const tva = montantHT * (invoiceFormData.tva / 100);
    const tps = montantHT * (invoiceFormData.tps / 100);
    const montantTTC = montantHT + tva + tps;

    // Générer un numéro de facture
    const year = new Date().getFullYear();
    const invoiceCount = invoices.filter(inv => inv.numero.startsWith(`FAC-EXP-${year}`)).length + 1;
    const numero = `FAC-EXP-${year}-${String(invoiceCount).padStart(3, '0')}`;

    const newInvoice: Invoice = {
      id: Date.now().toString(),
      numero,
      expenseId: selectedExpenseForInvoice.id,
      statut: 'en_attente' as const,
      montantHT,
      tva: invoiceFormData.tva > 0 ? tva : undefined,
      tps: invoiceFormData.tps > 0 ? tps : undefined,
      montantTTC,
      dateCreation: new Date().toISOString().split('T')[0],
      notes: invoiceFormData.notes || undefined,
    };

    setInvoices([...invoices, newInvoice]);
    toast.success('Facture créée avec succès');
    setIsInvoiceDialogOpen(false);
    resetInvoiceForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer cette dépense ? La transaction sera également supprimée du chauffeur.')) {
      const expense = expenses.find(exp => exp.id === id);
      
      // Supprimer la transaction du chauffeur si elle existe
      if (expense?.chauffeurId) {
        removeExpenseFromDriver(id, expense.chauffeurId, drivers, setDrivers);
      }
      
      setExpenses(expenses.filter(exp => exp.id !== id));
      toast.success('Dépense supprimée et synchronisée');
    }
  };

  // Fonctions utilitaires pour les labels (définies avant leur utilisation)
  const getTruckLabel = (id: string) => {
    if (!id) return 'N/A';
    const truck = trucks.find(t => t.id === id);
    return truck ? truck.immatriculation : 'N/A';
  };

  const getDriverLabel = (id?: string) => {
    if (!id) return '-';
    const driver = drivers.find(d => d.id === id);
    return driver ? `${driver.prenom} ${driver.nom}` : '-';
  };

  const filteredExpenses = expenses.filter(exp => {
    // Filtre par camion
    if (filterCamion !== 'all' && exp.camionId !== filterCamion) return false;
    
    // Filtre par catégorie
    if (filterCategorie !== 'all' && exp.categorie !== filterCategorie) return false;
    
    // Filtre par sous-catégorie
    if (filterSousCategorie !== 'all') {
      if (filterSousCategorie === 'none' && exp.sousCategorie) return false;
      if (filterSousCategorie !== 'none' && exp.sousCategorie !== filterSousCategorie) return false;
    }
    
    // Filtre par fournisseur
    if (filterFournisseur !== 'all') {
      if (filterFournisseur === 'none' && exp.fournisseurId) return false;
      if (filterFournisseur !== 'none' && exp.fournisseurId !== filterFournisseur) return false;
    }
    
    // Filtre par chauffeur
    if (filterChauffeur !== 'all') {
      if (filterChauffeur === 'none' && exp.chauffeurId) return false;
      if (filterChauffeur !== 'none' && exp.chauffeurId !== filterChauffeur) return false;
    }
    
    // Filtre par date (du)
    if (filterDateFrom && exp.date < filterDateFrom) return false;
    
    // Filtre par date (au)
    if (filterDateTo && exp.date > filterDateTo) return false;
    
    // Filtre par montant minimum
    if (filterMontantMin && exp.montant < parseFloat(filterMontantMin)) return false;
    
    // Filtre par montant maximum
    if (filterMontantMax && exp.montant > parseFloat(filterMontantMax)) return false;
    
    // Recherche générale
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesDescription = exp.description?.toLowerCase().includes(search);
      const matchesCategorie = exp.categorie.toLowerCase().includes(search);
      const matchesSousCategorie = exp.sousCategorie?.toLowerCase().includes(search);
      const matchesCamion = getTruckLabel(exp.camionId).toLowerCase().includes(search);
      const matchesChauffeur = getDriverLabel(exp.chauffeurId).toLowerCase().includes(search);
      const matchesFournisseur = exp.fournisseurId ? (thirdParties.find(tp => tp.id === exp.fournisseurId)?.nom || '').toLowerCase().includes(search) : false;
      
      if (!matchesDescription && !matchesCategorie && !matchesSousCategorie && !matchesCamion && !matchesChauffeur && !matchesFournisseur) {
        return false;
      }
    }
    
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.montant, 0);

  const expensesByCategory = expenses.reduce((acc, exp) => {
    acc[exp.categorie] = (acc[exp.categorie] || 0) + exp.montant;
    return acc;
  }, {} as Record<string, number>);
  
  const topCategory = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])[0];

  // Fonction pour générer la description des filtres
  const getFiltersDescription = () => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Recherche: "${searchTerm}"`);
    if (filterCamion !== 'all') filters.push(`Camion: ${getTruckLabel(filterCamion)}`);
    if (filterCategorie !== 'all') filters.push(`Catégorie: ${filterCategorie}`);
    if (filterSousCategorie !== 'all') {
      if (filterSousCategorie === 'none') filters.push('Sous-catégorie: Aucune');
      else filters.push(`Sous-catégorie: ${filterSousCategorie}`);
    }
    if (filterFournisseur !== 'all') {
      if (filterFournisseur === 'none') filters.push('Fournisseur: Aucun');
      else filters.push(`Fournisseur: ${thirdParties.find(tp => tp.id === filterFournisseur)?.nom || ''}`);
    }
    if (filterChauffeur !== 'all') {
      if (filterChauffeur === 'none') filters.push('Chauffeur: Aucun');
      else filters.push(`Chauffeur: ${getDriverLabel(filterChauffeur)}`);
    }
    if (filterDateFrom) filters.push(`Du: ${new Date(filterDateFrom).toLocaleDateString('fr-FR')}`);
    if (filterDateTo) filters.push(`Au: ${new Date(filterDateTo).toLocaleDateString('fr-FR')}`);
    if (filterMontantMin) filters.push(`Min: ${filterMontantMin} FCFA`);
    if (filterMontantMax) filters.push(`Max: ${filterMontantMax} FCFA`);
    return filters.length > 0 ? `Filtres appliqués: ${filters.join(', ')}` : undefined;
  };

  // Fonctions d'export
  const handleExportExcel = () => {
    exportToExcel({
      title: 'Liste des Dépenses',
      fileName: `depenses_${new Date().toISOString().split('T')[0]}.xlsx`,
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Date', value: (e) => new Date(e.date).toLocaleDateString('fr-FR') },
        { header: 'Catégorie', value: (e) => e.categorie },
        { header: 'Sous-catégorie', value: (e) => e.sousCategorie || '-' },
        { header: 'Description', value: (e) => e.description },
        { header: 'Camion', value: (e) => getTruckLabel(e.camionId) },
        { header: 'Chauffeur', value: (e) => getDriverLabel(e.chauffeurId) },
        { header: 'Fournisseur', value: (e) => e.fournisseurId ? (thirdParties.find(tp => tp.id === e.fournisseurId)?.nom || '-') : '-' },
        { header: 'Quantité', value: (e) => e.quantite !== undefined && e.quantite > 0 ? `${e.quantite} ${getUnite(e.categorie)}` : '-' },
        { header: 'Prix unitaire (FCFA)', value: (e) => e.prixUnitaire !== undefined && e.prixUnitaire > 0 ? e.prixUnitaire : '-' },
        { header: 'Prix total (FCFA)', value: (e) => e.montant },
      ],
      rows: filteredExpenses,
    });
    toast.success('Export Excel généré avec succès');
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: 'Liste des Dépenses',
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Date', value: (e) => new Date(e.date).toLocaleDateString('fr-FR') },
        { header: 'Catégorie', value: (e) => e.categorie },
        { header: 'Sous-catégorie', value: (e) => e.sousCategorie || '-' },
        { header: 'Description', value: (e) => e.description },
        { header: 'Camion', value: (e) => getTruckLabel(e.camionId) },
        { header: 'Chauffeur', value: (e) => getDriverLabel(e.chauffeurId) },
        { header: 'Quantité', value: (e) => e.quantite !== undefined && e.quantite > 0 ? `${e.quantite} ${getUnite(e.categorie)}` : '-' },
        { header: 'Prix unitaire', value: (e) => e.prixUnitaire !== undefined && e.prixUnitaire > 0 ? e.prixUnitaire.toLocaleString('fr-FR') + ' FCFA' : '-' },
        { header: 'Prix total (FCFA)', value: (e) => e.montant.toLocaleString('fr-FR') },
      ],
      rows: filteredExpenses,
    });
  };

  return (
    <div className="space-y-6 p-1">
      {/* En-tête professionnel */}
      <PageHeader
        title="Gestion des Dépenses"
        description="Suivez et contrôlez toutes vos dépenses d'exploitation"
        icon={Receipt}
        gradient="from-red-500/20 via-orange-500/10 to-transparent"
        stats={[
          {
            label: 'Total',
            value: `${totalExpenses.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`,
            icon: <TrendingDown className="h-4 w-4" />,
            color: 'text-red-600 dark:text-red-400'
          },
          {
            label: 'Nb. Dépenses',
            value: filteredExpenses.length,
            icon: <Receipt className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'Catégorie Top',
            value: topCategory ? topCategory[0] : 'N/A',
            icon: <DollarSign className="h-4 w-4" />,
            color: 'text-orange-600 dark:text-orange-400'
          },
          {
            label: 'Montant Top',
            value: topCategory ? `${topCategory[1].toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA` : '0',
            icon: <DollarSign className="h-4 w-4" />,
            color: 'text-purple-600 dark:text-purple-400'
          }
        ]}
        actions={
          <div className="flex gap-2">
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
                <Button className="shadow-md hover:shadow-lg transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter une dépense
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingExpense ? 'Modifier' : 'Ajouter'} une dépense</DialogTitle>
              </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="camion">Camion</Label>
                  <Select value={formData.camionId} onValueChange={(value) => setFormData({ ...formData, camionId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {trucks.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.immatriculation} - {t.modele}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="chauffeur">Chauffeur (optionnel)</Label>
                  <Select value={formData.chauffeurId || 'none'} onValueChange={(value) => setFormData({ ...formData, chauffeurId: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {drivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="tripId">Trajet (optionnel)</Label>
                <Select value={formData.tripId || 'none'} onValueChange={(value) => setFormData({ ...formData, tripId: value === 'none' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Lier à un trajet" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun trajet</SelectItem>
                    {trips.map(trip => (
                      <SelectItem key={trip.id} value={trip.id}>
                        {trip.origine} → {trip.destination} {trip.client && `(${trip.client})`} - {new Date(trip.dateDepart).toLocaleDateString('fr-FR')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Lier cette dépense à un trajet spécifique</p>
              </div>
              <div>
                <Label htmlFor="categorie">Catégorie</Label>
                <Select value={formData.categorie} onValueChange={(value) => setFormData({ ...formData, categorie: value, sousCategorie: '' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sousCategorie">Sous-catégorie (optionnel)</Label>
                <div className="flex gap-2">
                  <Select value={formData.sousCategorie || 'none'} onValueChange={(value) => setFormData({ ...formData, sousCategorie: value === 'none' ? '' : value })}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Sélectionner ou ajouter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune</SelectItem>
                      {(subCategories[formData.categorie] || []).map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-1">
                    <Input
                      placeholder="Nouvelle sous-catégorie"
                      value={newSubCategory}
                      onChange={(e) => setNewSubCategory(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubCategory())}
                      className="w-[180px]"
                    />
                    <Button type="button" onClick={handleAddSubCategory} size="sm" variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="fournisseur">Fournisseur (optionnel)</Label>
                <Select value={formData.fournisseurId || 'none'} onValueChange={(value) => setFormData({ ...formData, fournisseurId: value === 'none' ? '' : value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un fournisseur" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun fournisseur</SelectItem>
                    {thirdParties
                      .filter(tp => tp.type === 'fournisseur')
                      .map(tp => (
                        <SelectItem key={tp.id} value={tp.id}>
                          {tp.nom}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Vous pouvez ajouter des fournisseurs dans la section "Tiers"
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quantite">Quantité ({getUnite(formData.categorie)})</Label>
                  <NumberInput
                    id="quantite"
                    min={0}
                    value={formData.quantite}
                    onChange={(value) => {
                      const newQuantite = value;
                      const calculatedMontant = calculateMontant(newQuantite, formData.prixUnitaire);
                      setFormData({ 
                        ...formData, 
                        quantite: newQuantite,
                        montant: calculatedMontant !== undefined ? calculatedMontant : formData.montant
                      });
                    }}
                    placeholder="Ex: 100"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Optionnel</p>
                </div>
                <div>
                  <Label htmlFor="prixUnitaire">Prix unitaire (FCFA)</Label>
                  <NumberInput
                    id="prixUnitaire"
                    min={0}
                    value={formData.prixUnitaire}
                    onChange={(value) => {
                      const newPrixUnitaire = value;
                      const calculatedMontant = calculateMontant(formData.quantite, newPrixUnitaire);
                      setFormData({ 
                        ...formData, 
                        prixUnitaire: newPrixUnitaire,
                        montant: calculatedMontant !== undefined ? calculatedMontant : formData.montant
                      });
                    }}
                    placeholder="Ex: 700"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Optionnel</p>
                </div>
                <div>
                  <Label htmlFor="montant">Prix total (FCFA)</Label>
                  <NumberInput
                    id="montant"
                    min={0}
                    value={formData.montant}
                    onChange={(value) => setFormData({ ...formData, montant: value })}
                    required
                    placeholder="Entrer le montant"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.quantite && formData.prixUnitaire && formData.quantite > 0 && formData.prixUnitaire > 0
                      ? `Calculé: ${(formData.quantite * formData.prixUnitaire).toLocaleString('fr-FR')} FCFA`
                      : 'Saisie manuelle'}
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                {editingExpense ? 'Modifier' : 'Ajouter'}
              </Button>
            </form>
            </DialogContent>
          </Dialog>
          </div>
        }
      />

      {/* Filtres - Design amélioré */}
      <div className="bg-gradient-to-br from-card to-muted/20 rounded-xl p-5 shadow-lg border border-border/50 backdrop-blur-sm">
        <div className="flex flex-col gap-4">
          {/* En-tête des filtres */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Filtres</h3>
            </div>
            {(filterCamion !== 'all' || filterCategorie !== 'all' || filterSousCategorie !== 'all' || filterFournisseur !== 'all' || filterChauffeur !== 'all' || filterDateFrom || filterDateTo || filterMontantMin || filterMontantMax || searchTerm) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterCamion('all');
                  setFilterCategorie('all');
                  setFilterSousCategorie('all');
                  setFilterFournisseur('all');
                  setFilterChauffeur('all');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setFilterMontantMin('');
                  setFilterMontantMax('');
                  setSearchTerm('');
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Réinitialiser
              </Button>
            )}
          </div>

          {/* Recherche générale */}
          <div>
            <Label htmlFor="search-expenses" className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />
              Recherche générale
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-expenses"
                placeholder="Rechercher par description, catégorie, camion, chauffeur, fournisseur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filtres actifs */}
          {(filterCamion !== 'all' || filterCategorie !== 'all' || filterSousCategorie !== 'all' || filterFournisseur !== 'all' || filterChauffeur !== 'all' || filterDateFrom || filterDateTo || filterMontantMin || filterMontantMax) && (
            <div className="flex flex-wrap gap-2 pb-2">
              {filterCamion !== 'all' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  <Truck className="h-3 w-3 mr-1.5" />
                  {trucks.find(t => t.id === filterCamion)?.immatriculation || 'Camion'}
                  <button
                    onClick={() => setFilterCamion('all')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre camion"
                    title="Retirer le filtre camion"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterCategorie !== 'all' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  <Tag className="h-3 w-3 mr-1.5" />
                  {filterCategorie}
                  <button
                    onClick={() => setFilterCategorie('all')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre catégorie"
                    title="Retirer le filtre catégorie"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterSousCategorie !== 'all' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  <Tag className="h-3 w-3 mr-1.5" />
                  {filterSousCategorie === 'none' ? 'Sans sous-catégorie' : filterSousCategorie}
                  <button
                    onClick={() => setFilterSousCategorie('all')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre sous-catégorie"
                    title="Retirer le filtre sous-catégorie"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterFournisseur !== 'all' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  <User className="h-3 w-3 mr-1.5" />
                  {filterFournisseur === 'none' ? 'Sans fournisseur' : (thirdParties.find(tp => tp.id === filterFournisseur)?.nom || 'Fournisseur')}
                  <button
                    onClick={() => setFilterFournisseur('all')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre fournisseur"
                    title="Retirer le filtre fournisseur"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterChauffeur !== 'all' && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  <User className="h-3 w-3 mr-1.5" />
                  {filterChauffeur === 'none' ? 'Sans chauffeur' : getDriverLabel(filterChauffeur)}
                  <button
                    onClick={() => setFilterChauffeur('all')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre chauffeur"
                    title="Retirer le filtre chauffeur"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterDateFrom && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  Du: {new Date(filterDateFrom).toLocaleDateString('fr-FR')}
                  <button
                    onClick={() => setFilterDateFrom('')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre date de début"
                    title="Retirer le filtre date de début"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterDateTo && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  Au: {new Date(filterDateTo).toLocaleDateString('fr-FR')}
                  <button
                    onClick={() => setFilterDateTo('')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre date de fin"
                    title="Retirer le filtre date de fin"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterMontantMin && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  Min: {parseFloat(filterMontantMin).toLocaleString('fr-FR')} FCFA
                  <button
                    onClick={() => setFilterMontantMin('')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre montant minimum"
                    title="Retirer le filtre montant minimum"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {filterMontantMax && (
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                  Max: {parseFloat(filterMontantMax).toLocaleString('fr-FR')} FCFA
                  <button
                    onClick={() => setFilterMontantMax('')}
                    className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    aria-label="Retirer le filtre montant maximum"
                    title="Retirer le filtre montant maximum"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {/* Sélecteurs de filtres */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Filtrer par camion
              </Label>
              <Select value={filterCamion} onValueChange={setFilterCamion}>
                <SelectTrigger className="w-full h-11 bg-background hover:bg-muted/50 transition-colors border-border/50 focus:border-primary/50 shadow-sm">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sélectionner un camion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Tous les camions
                    </div>
                  </SelectItem>
                  {trucks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      <div className="flex items-center gap-2">
                        <Truck className="h-3 w-3 text-muted-foreground" />
                        {t.immatriculation} - {t.modele}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Filtrer par catégorie
              </Label>
              <Select value={filterCategorie} onValueChange={(value) => {
                setFilterCategorie(value);
                setFilterSousCategorie('all'); // Réinitialiser la sous-catégorie quand on change de catégorie
              }}>
                <SelectTrigger className="w-full h-11 bg-background hover:bg-muted/50 transition-colors border-border/50 focus:border-primary/50 shadow-sm">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Toutes catégories
                    </div>
                  </SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      <div className="flex items-center gap-2">
                        <Tag className="h-3 w-3 text-muted-foreground" />
                        {cat}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filterCategorie !== 'all' && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Sous-catégorie
                </Label>
                <Select value={filterSousCategorie} onValueChange={setFilterSousCategorie}>
                  <SelectTrigger className="w-full h-11 bg-background hover:bg-muted/50 transition-colors border-border/50 focus:border-primary/50 shadow-sm">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Sélectionner une sous-catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les sous-catégories</SelectItem>
                    <SelectItem value="none">Sans sous-catégorie</SelectItem>
                    {(subCategories[filterCategorie] || []).map(sub => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Fournisseur
              </Label>
              <Select value={filterFournisseur} onValueChange={setFilterFournisseur}>
                <SelectTrigger className="w-full h-11 bg-background hover:bg-muted/50 transition-colors border-border/50 focus:border-primary/50 shadow-sm">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les fournisseurs</SelectItem>
                  <SelectItem value="none">Sans fournisseur</SelectItem>
                  {thirdParties
                    ?.filter(tp => tp.type === 'fournisseur' && tp.nom && tp.nom.trim() !== '' && tp.id && tp.id.trim() !== '')
                    .map(tp => tp.id ? (
                      <SelectItem key={tp.id} value={tp.id}>{tp.nom}</SelectItem>
                    ) : null)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Chauffeur
              </Label>
              <Select value={filterChauffeur} onValueChange={setFilterChauffeur}>
                <SelectTrigger className="w-full h-11 bg-background hover:bg-muted/50 transition-colors border-border/50 focus:border-primary/50 shadow-sm">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Sélectionner un chauffeur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les chauffeurs</SelectItem>
                  <SelectItem value="none">Sans chauffeur</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2">Date de début</Label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-11"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2">Date de fin</Label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-11"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2">Montant minimum (FCFA)</Label>
              <NumberInput
                value={filterMontantMin ? parseFloat(filterMontantMin) : undefined}
                onChange={(value) => setFilterMontantMin(value ? value.toString() : '')}
                min={0}
                placeholder="Min"
                className="h-11"
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-muted-foreground mb-2">Montant maximum (FCFA)</Label>
              <NumberInput
                value={filterMontantMax ? parseFloat(filterMontantMax) : undefined}
                onChange={(value) => setFilterMontantMax(value ? value.toString() : '')}
                min={0}
                placeholder="Max"
                className="h-11"
              />
            </div>
          </div>
        </div>
      </div>

      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20">
          <CardTitle className="flex items-center gap-2">
            💰 Liste des Dépenses - Total: <span className="text-red-600 dark:text-red-400 font-bold">{totalExpenses.toLocaleString('fr-FR')} FCFA</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Catégorie</TableHead>
                <TableHead>Sous-catégorie</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Camion</TableHead>
                <TableHead>Chauffeur</TableHead>
                <TableHead>Trajet</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Quantité</TableHead>
                <TableHead className="text-right">Prix unitaire</TableHead>
                <TableHead className="text-right">Prix total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => {
                const hasInvoice = invoices.some(inv => inv.expenseId === expense.id);
                const supplier = expense.fournisseurId ? thirdParties.find(tp => tp.id === expense.fournisseurId) : null;
                
                return (
                <TableRow key={expense.id} className="hover:bg-muted/50 transition-colors duration-200">
                  <TableCell className="font-semibold">{expense.categorie}</TableCell>
                    <TableCell>{expense.sousCategorie || '-'}</TableCell>
                    <TableCell>{supplier ? supplier.nom : '-'}</TableCell>
                  <TableCell>{getTruckLabel(expense.camionId)}</TableCell>
                  <TableCell>{getDriverLabel(expense.chauffeurId)}</TableCell>
                  <TableCell>
                    {expense.tripId ? (() => {
                      const trip = trips.find(t => t.id === expense.tripId);
                      return trip ? (
                        <div className="text-xs">
                          <div className="font-medium">{trip.origine} → {trip.destination}</div>
                          {trip.client && <div className="text-muted-foreground">{trip.client}</div>}
                        </div>
                      ) : '-';
                    })() : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{new Date(expense.date).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    {expense.quantite !== undefined && expense.quantite > 0
                      ? `${expense.quantite.toLocaleString('fr-FR')} ${getUnite(expense.categorie)}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {expense.prixUnitaire !== undefined && expense.prixUnitaire > 0
                      ? `${expense.prixUnitaire.toLocaleString('fr-FR')} FCFA`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-destructive">{expense.montant.toLocaleString('fr-FR')} FCFA</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                        {!hasInvoice && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleCreateInvoice(expense)} 
                            className="hover:shadow-md transition-all duration-200"
                            title="Créer une facture"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(expense)} className="hover:shadow-md transition-all duration-200">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(expense.id)} className="hover:shadow-md transition-all duration-200">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de création de facture */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={(open) => {
        setIsInvoiceDialogOpen(open);
        if (!open) resetInvoiceForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer une facture pour la dépense</DialogTitle>
          </DialogHeader>
          {selectedExpenseForInvoice && (
            <form onSubmit={handleSubmitInvoice} className="space-y-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Dépense:</span>
                  <span className="text-sm">{selectedExpenseForInvoice.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Catégorie:</span>
                  <span className="text-sm">{selectedExpenseForInvoice.categorie} {selectedExpenseForInvoice.sousCategorie && `- ${selectedExpenseForInvoice.sousCategorie}`}</span>
                </div>
                {selectedExpenseForInvoice.fournisseurId && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Fournisseur:</span>
                    <span className="text-sm">
                      {thirdParties.find(tp => tp.id === selectedExpenseForInvoice.fournisseurId)?.nom || '-'}
                    </span>
                  </div>
                )}
                {selectedExpenseForInvoice.quantite !== undefined && selectedExpenseForInvoice.quantite > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Quantité:</span>
                    <span className="text-sm">{selectedExpenseForInvoice.quantite.toLocaleString('fr-FR')} {getUnite(selectedExpenseForInvoice.categorie)}</span>
                  </div>
                )}
                {selectedExpenseForInvoice.prixUnitaire !== undefined && selectedExpenseForInvoice.prixUnitaire > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Prix unitaire:</span>
                    <span className="text-sm">{selectedExpenseForInvoice.prixUnitaire.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Montant HT:</span>
                  <span className="text-sm font-bold">{selectedExpenseForInvoice.montant.toLocaleString('fr-FR')} FCFA</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tva">TVA (%)</Label>
                  <NumberInput
                    id="tva"
                    min={0}
                    max={100}
                    value={invoiceFormData.tva}
                    onChange={(value) => setInvoiceFormData({ ...invoiceFormData, tva: value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="tps">TPS (%)</Label>
                  <NumberInput
                    id="tps"
                    min={0}
                    max={100}
                    value={invoiceFormData.tps}
                    onChange={(value) => setInvoiceFormData({ ...invoiceFormData, tps: value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (optionnel)</Label>
                <Input
                  id="notes"
                  value={invoiceFormData.notes}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, notes: e.target.value })}
                  placeholder="Notes supplémentaires"
                />
              </div>

              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Montant HT:</span>
                  <span>{selectedExpenseForInvoice.montant.toLocaleString('fr-FR')} FCFA</span>
                </div>
                {invoiceFormData.tva > 0 && (
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span>TVA ({invoiceFormData.tva}%):</span>
                    <span>{(selectedExpenseForInvoice.montant * (invoiceFormData.tva / 100)).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                {invoiceFormData.tps > 0 && (
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span>TPS ({invoiceFormData.tps}%):</span>
                    <span>{(selectedExpenseForInvoice.montant * (invoiceFormData.tps / 100)).toLocaleString('fr-FR')} FCFA</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                  <span>Montant TTC:</span>
                  <span className="text-primary">
                    {(selectedExpenseForInvoice.montant + 
                      (selectedExpenseForInvoice.montant * (invoiceFormData.tva / 100)) + 
                      (selectedExpenseForInvoice.montant * (invoiceFormData.tps / 100))
                    ).toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsInvoiceDialogOpen(false)} className="flex-1">
                  Annuler
                </Button>
                <Button type="submit" className="flex-1">
                  Créer la facture
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
