import { useState } from 'react';
import { useApp, Truck, TruckType, TruckStatus, ThirdParty } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, Filter, Eye, Truck as TruckIcon, Search, X, Route, DollarSign, FileDown, FileText, Satellite } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { isTruckInUse, deleteExpensesForTruck, calculateTruckStats } from '@/lib/sync-utils';
import PageHeader from '@/components/PageHeader';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';

export default function Trucks() {
  const navigate = useNavigate();
  const { trucks, setTrucks, trips, expenses, setExpenses, drivers, setDrivers, thirdParties } = useApp();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<Truck | null>(null);
  const [filterType, setFilterType] = useState<TruckType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<TruckStatus | 'all'>('all');
  const [filterProprietaire, setFilterProprietaire] = useState<string>('all');
  const [filterModele, setFilterModele] = useState<string>('all');
  const [filterMinTrips, setFilterMinTrips] = useState<string>('');
  const [filterMaxTrips, setFilterMaxTrips] = useState<string>('');
  const [filterMinRecettes, setFilterMinRecettes] = useState<string>('');
  const [filterMaxRecettes, setFilterMaxRecettes] = useState<string>('');
  const [filterMinDepenses, setFilterMinDepenses] = useState<string>('');
  const [filterMaxDepenses, setFilterMaxDepenses] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewingTruck, setViewingTruck] = useState<Truck | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  const [formData, setFormData] = useState({
    immatriculation: '',
    modele: '',
    type: 'tracteur' as TruckType,
    statut: 'actif' as TruckStatus,
    dateMiseEnCirculation: '',
    photo: '',
    proprietaireId: '',
  });

  const resetForm = () => {
    setFormData({
      immatriculation: '',
      modele: '',
      type: 'tracteur',
      statut: 'actif',
      dateMiseEnCirculation: '',
      photo: '',
      proprietaireId: '',
    });
    setEditingTruck(null);
    setPhotoPreview('');
  };


  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setFormData({ ...formData, photo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const truckData = {
      ...formData,
      proprietaireId: formData.proprietaireId || undefined,
    };
    
    if (editingTruck) {
      setTrucks(trucks.map(t => t.id === editingTruck.id ? { ...truckData, id: editingTruck.id } : t));
      toast.success('Camion modifié avec succès');
    } else {
      const newTruck = { ...truckData, id: Date.now().toString() };
      setTrucks([...trucks, newTruck]);
      toast.success('Camion ajouté avec succès');
    }
    
    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (truck: Truck) => {
    setEditingTruck(truck);
    setFormData({
      ...truck,
      proprietaireId: truck.proprietaireId || '',
    });
    setPhotoPreview(truck.photo || '');
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // Vérifier si le camion est utilisé dans un trajet actif
    if (isTruckInUse(id, trips)) {
      toast.error('Impossible de supprimer ce camion : il est utilisé dans un trajet en cours ou planifié');
      return;
    }

    // Calculer les statistiques avant suppression
    const stats = calculateTruckStats(id, trips, expenses);
    
    if (confirm(
      `Êtes-vous sûr de vouloir supprimer ce camion ?\n\n` +
      `Statistiques :\n` +
      `- ${stats.tripsCount} trajets effectués\n` +
      `- ${stats.revenue.toLocaleString('fr-FR')} FCFA de revenus\n` +
      `- ${stats.expenses.toLocaleString('fr-FR')} FCFA de dépenses\n\n` +
      `Toutes les dépenses associées seront également supprimées.`
    )) {
      // Supprimer les dépenses associées
      deleteExpensesForTruck(id, expenses, setExpenses, drivers, setDrivers);
      
      // Supprimer le camion
      setTrucks(trucks.filter(t => t.id !== id));
      toast.success('Camion et dépenses associées supprimés');
    }
  };

  // Calculer les statistiques pour chaque camion
  const trucksWithStats = trucks.map(truck => {
    const stats = calculateTruckStats(truck.id, trips, expenses);
    return { truck, stats };
  });

  const filteredTrucks = trucksWithStats
    .filter(({ truck, stats }) => {
      // Recherche générale
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesImmatriculation = truck.immatriculation.toLowerCase().includes(search);
        const matchesModele = truck.modele?.toLowerCase().includes(search);
        const matchesProprietaire = truck.proprietaireId ? (thirdParties.find(tp => tp.id === truck.proprietaireId)?.nom || '').toLowerCase().includes(search) : false;
        
        if (!matchesImmatriculation && !matchesModele && !matchesProprietaire) {
          return false;
        }
      }
      
      // Filtre par type (catégorie)
      if (filterType !== 'all' && truck.type !== filterType) return false;
      
      // Filtre par statut
      if (filterStatus !== 'all' && truck.statut !== filterStatus) return false;
      
      // Filtre par propriétaire
      if (filterProprietaire !== 'all') {
        if (filterProprietaire === 'none' && truck.proprietaireId) return false;
        if (filterProprietaire !== 'none' && truck.proprietaireId !== filterProprietaire) return false;
      }
      
      // Filtre par modèle
      if (filterModele !== 'all' && truck.modele !== filterModele) return false;
      
      // Filtre par nombre de trajets
      if (filterMinTrips && stats.tripsCount < parseInt(filterMinTrips)) return false;
      if (filterMaxTrips && stats.tripsCount > parseInt(filterMaxTrips)) return false;
      
      // Filtre par recettes
      if (filterMinRecettes && stats.revenue < parseFloat(filterMinRecettes)) return false;
      if (filterMaxRecettes && stats.revenue > parseFloat(filterMaxRecettes)) return false;
      
      // Filtre par dépenses
      if (filterMinDepenses && stats.expenses < parseFloat(filterMinDepenses)) return false;
      if (filterMaxDepenses && stats.expenses > parseFloat(filterMaxDepenses)) return false;
      
      return true;
    })
    .map(({ truck }) => truck);

  const activeTrucks = trucks.filter(t => t.statut === 'actif').length;
  const tracteurs = trucks.filter(t => t.type === 'tracteur').length;
  const remorqueuses = trucks.filter(t => t.type === 'remorqueuse').length;

  // Fonction pour générer la description des filtres
  const getFiltersDescription = () => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Recherche: "${searchTerm}"`);
    if (filterType !== 'all') filters.push(`Type: ${filterType === 'tracteur' ? 'Tracteur' : 'Remorqueuse'}`);
    if (filterStatus !== 'all') filters.push(`Statut: ${filterStatus === 'actif' ? 'Actif' : 'Inactif'}`);
    if (filterProprietaire !== 'all') {
      if (filterProprietaire === 'none') filters.push('Propriétaire: Aucun');
      else filters.push(`Propriétaire: ${thirdParties.find(tp => tp.id === filterProprietaire)?.nom || ''}`);
    }
    if (filterModele !== 'all') filters.push(`Modèle: ${filterModele}`);
    if (filterMinTrips) filters.push(`Min trajets: ${filterMinTrips}`);
    if (filterMaxTrips) filters.push(`Max trajets: ${filterMaxTrips}`);
    if (filterMinRecettes) filters.push(`Min recettes: ${filterMinRecettes} FCFA`);
    if (filterMaxRecettes) filters.push(`Max recettes: ${filterMaxRecettes} FCFA`);
    if (filterMinDepenses) filters.push(`Min dépenses: ${filterMinDepenses} FCFA`);
    if (filterMaxDepenses) filters.push(`Max dépenses: ${filterMaxDepenses} FCFA`);
    return filters.length > 0 ? `Filtres appliqués: ${filters.join(', ')}` : undefined;
  };

  // Fonctions d'export
  const handleExportExcel = () => {
    exportToExcel({
      title: 'Liste des Camions',
      fileName: `camions_${new Date().toISOString().split('T')[0]}.xlsx`,
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Immatriculation', value: (t) => t.immatriculation },
        { header: 'Modèle', value: (t) => t.modele },
        { header: 'Type', value: (t) => t.type === 'tracteur' ? 'Tracteur' : 'Remorqueuse' },
        { header: 'Statut', value: (t) => t.statut === 'actif' ? 'Actif' : 'Inactif' },
        { header: 'Propriétaire', value: (t) => t.proprietaireId ? (thirdParties.find(tp => tp.id === t.proprietaireId)?.nom || '-') : '-' },
        { header: 'Nb. Trajets', value: (t) => calculateTruckStats(t.id, trips, expenses).tripsCount },
        { header: 'Recettes (FCFA)', value: (t) => calculateTruckStats(t.id, trips, expenses).revenue },
        { header: 'Dépenses (FCFA)', value: (t) => calculateTruckStats(t.id, trips, expenses).expenses },
        { header: 'Bénéfice (FCFA)', value: (t) => calculateTruckStats(t.id, trips, expenses).profit },
        { header: 'Mise en circulation', value: (t) => new Date(t.dateMiseEnCirculation).toLocaleDateString('fr-FR') },
      ],
      rows: filteredTrucks,
    });
    toast.success('Export Excel généré avec succès');
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: 'Liste des Camions',
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Immatriculation', value: (t) => t.immatriculation },
        { header: 'Modèle', value: (t) => t.modele },
        { header: 'Type', value: (t) => t.type === 'tracteur' ? 'Tracteur' : 'Remorqueuse' },
        { header: 'Statut', value: (t) => t.statut === 'actif' ? 'Actif' : 'Inactif' },
        { header: 'Propriétaire', value: (t) => t.proprietaireId ? (thirdParties.find(tp => tp.id === t.proprietaireId)?.nom || '-') : '-' },
        { header: 'Nb. Trajets', value: (t) => calculateTruckStats(t.id, trips, expenses).tripsCount },
        { header: 'Recettes (FCFA)', value: (t) => calculateTruckStats(t.id, trips, expenses).revenue.toLocaleString('fr-FR') },
        { header: 'Dépenses (FCFA)', value: (t) => calculateTruckStats(t.id, trips, expenses).expenses.toLocaleString('fr-FR') },
        { header: 'Bénéfice (FCFA)', value: (t) => calculateTruckStats(t.id, trips, expenses).profit.toLocaleString('fr-FR') },
      ],
      rows: filteredTrucks,
    });
  };

  return (
    <div className="space-y-6 p-1">
      {/* En-tête professionnel */}
      <PageHeader
        title="Gestion de la Flotte"
        description="Gérez vos camions, tracteurs et remorqueuses avec facilité"
        icon={TruckIcon}
        gradient="from-orange-500/20 via-red-500/10 to-transparent"
        stats={[
          {
            label: 'Total',
            value: trucks.length,
            icon: <TruckIcon className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'Actifs',
            value: activeTrucks,
            icon: <TruckIcon className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'Tracteurs',
            value: tracteurs,
            icon: <TruckIcon className="h-4 w-4" />,
            color: 'text-orange-600 dark:text-orange-400'
          },
          {
            label: 'Remorqueuses',
            value: remorqueuses,
            icon: <TruckIcon className="h-4 w-4" />,
            color: 'text-purple-600 dark:text-purple-400'
          }
        ]}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => navigate('/gps')} 
              className="shadow-md hover:shadow-lg transition-all duration-300 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-950/50"
            >
              <Satellite className="mr-2 h-4 w-4" />
              Configuration GPS
            </Button>
            <Button variant="outline" onClick={handleExportExcel} className="shadow-md hover:shadow-lg transition-all duration-300">
              <FileDown className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" onClick={handleExportPDF} className="shadow-md hover:shadow-lg transition-all duration-300">
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="shadow-md hover:shadow-lg transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un camion
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTruck ? 'Modifier le camion' : 'Ajouter un camion'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="immatriculation">Immatriculation</Label>
                  <Input
                    id="immatriculation"
                    value={formData.immatriculation}
                    onChange={(e) => setFormData({ ...formData, immatriculation: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="modele">Modèle</Label>
                  <Input
                    id="modele"
                    value={formData.modele}
                    onChange={(e) => setFormData({ ...formData, modele: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as TruckType })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tracteur">Tracteur</SelectItem>
                      <SelectItem value="remorqueuse">Remorqueuse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="statut">Statut</Label>
                  <Select value={formData.statut} onValueChange={(value) => setFormData({ ...formData, statut: value as TruckStatus })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date de mise en circulation</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.dateMiseEnCirculation}
                    onChange={(e) => setFormData({ ...formData, dateMiseEnCirculation: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="proprietaire">
                    Propriétaire
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({thirdParties?.filter(tp => tp.type === 'proprietaire').length || 0} disponible{(thirdParties?.filter(tp => tp.type === 'proprietaire').length || 0) > 1 ? 's' : ''})
                    </span>
                  </Label>
                  <Select 
                    value={formData.proprietaireId || 'none'} 
                    onValueChange={(value) => setFormData({ ...formData, proprietaireId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un propriétaire (optionnel)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun propriétaire</SelectItem>
                      {thirdParties
                        ?.filter(tp => tp.type === 'proprietaire' && tp.nom && tp.nom.trim() !== '' && tp.id && tp.id.trim() !== '')
                        .map(tp => tp.id ? (
                          <SelectItem key={tp.id} value={tp.id}>
                            {tp.nom}
                          </SelectItem>
                        ) : null)}
                      {(!thirdParties || thirdParties.filter(tp => tp.type === 'proprietaire' && tp.nom && tp.id).length === 0) && (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                          <p className="mb-2">Aucun propriétaire enregistré</p>
                          <p className="text-xs">Créez un propriétaire dans la section "Tiers"</p>
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les propriétaires sont gérés dans la section "Tiers"
                  </p>
                </div>
                <div>
                  <Label htmlFor="photo">Photo du camion</Label>
                  <Input
                    id="photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                  {photoPreview && (
                    <div className="mt-3">
                      <img 
                        src={photoPreview} 
                        alt="Aperçu" 
                        className="w-full h-48 rounded-lg object-cover border-2 border-primary"
                      />
                    </div>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  {editingTruck ? 'Modifier' : 'Ajouter'}
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
              <Filter className="h-5 w-5" />
              Filtres de recherche
            </CardTitle>
            {(searchTerm || filterType !== 'all' || filterStatus !== 'all' || filterProprietaire !== 'all' || filterModele !== 'all' || 
              filterMinTrips || filterMaxTrips || filterMinRecettes || filterMaxRecettes || filterMinDepenses || filterMaxDepenses) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('all');
                  setFilterStatus('all');
                  setFilterProprietaire('all');
                  setFilterModele('all');
                  setFilterMinTrips('');
                  setFilterMaxTrips('');
                  setFilterMinRecettes('');
                  setFilterMaxRecettes('');
                  setFilterMinDepenses('');
                  setFilterMaxDepenses('');
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
            {/* Recherche générale */}
            <div>
              <Label htmlFor="search-trucks" className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Recherche générale
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-trucks"
                  placeholder="Rechercher par immatriculation, modèle ou propriétaire..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          
            {/* Filtres actifs */}
            {(filterType !== 'all' || filterStatus !== 'all' || filterProprietaire !== 'all' || filterModele !== 'all' || 
              filterMinTrips || filterMaxTrips || filterMinRecettes || filterMaxRecettes || filterMinDepenses || filterMaxDepenses) && (
              <div className="flex flex-wrap gap-2 pb-2">
                {filterType !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Type: {filterType === 'tracteur' ? 'Tracteur' : 'Remorqueuse'}
                    <button
                      onClick={() => setFilterType('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                      aria-label="Retirer le filtre type"
                      title="Retirer le filtre type"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterStatus !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Statut: {filterStatus === 'actif' ? 'Actif' : 'Inactif'}
                    <button
                      onClick={() => setFilterStatus('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                      aria-label="Retirer le filtre statut"
                      title="Retirer le filtre statut"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterProprietaire !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    {filterProprietaire === 'none' ? 'Sans propriétaire' : (thirdParties.find(tp => tp.id === filterProprietaire)?.nom || 'Propriétaire')}
                    <button
                      onClick={() => setFilterProprietaire('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                      aria-label="Retirer le filtre propriétaire"
                      title="Retirer le filtre propriétaire"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterModele !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Modèle: {filterModele}
                    <button
                      onClick={() => setFilterModele('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                      aria-label="Retirer le filtre modèle"
                      title="Retirer le filtre modèle"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Première ligne de filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Catégorie (Type)</Label>
          <Select value={filterType} onValueChange={(value) => setFilterType(value as TruckType | 'all')}>
                <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="tracteur">Tracteur</SelectItem>
              <SelectItem value="remorqueuse">Remorqueuse</SelectItem>
            </SelectContent>
          </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1">Statut</Label>
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TruckStatus | 'all')}>
                <SelectTrigger>
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="actif">Actif</SelectItem>
              <SelectItem value="inactif">Inactif</SelectItem>
            </SelectContent>
          </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1">Propriétaire</Label>
              <Select value={filterProprietaire} onValueChange={setFilterProprietaire}>
                <SelectTrigger>
                  <SelectValue placeholder="Propriétaire" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les propriétaires</SelectItem>
                  <SelectItem value="none">Aucun propriétaire</SelectItem>
                  {thirdParties
                    ?.filter(tp => tp.type === 'proprietaire' && tp.nom && tp.nom.trim() !== '' && tp.id && tp.id.trim() !== '')
                    .map(tp => tp.id ? (
                      <SelectItem key={tp.id} value={tp.id}>
                        {tp.nom}
                      </SelectItem>
                    ) : null)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground mb-1">Modèle</Label>
              <Select value={filterModele} onValueChange={setFilterModele}>
                <SelectTrigger>
                  <SelectValue placeholder="Modèle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les modèles</SelectItem>
                  {Array.from(new Set(trucks.map(t => t.modele).filter(Boolean))).filter(modele => modele && modele.trim() !== '').map(modele => modele ? (
                    <SelectItem key={modele} value={modele}>
                      {modele}
                    </SelectItem>
                  ) : null)}
                </SelectContent>
              </Select>
            </div>
          </div>

            {/* Deuxième ligne - Filtres numériques */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 pt-2 border-t">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Trajets (Min)</Label>
              <Input
                type="number"
                placeholder="Min"
                value={filterMinTrips}
                onChange={(e) => setFilterMinTrips(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Trajets (Max)</Label>
              <Input
                type="number"
                placeholder="Max"
                value={filterMaxTrips}
                onChange={(e) => setFilterMaxTrips(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Recettes (Min) FCFA</Label>
              <Input
                type="number"
                placeholder="Min"
                value={filterMinRecettes}
                onChange={(e) => setFilterMinRecettes(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Recettes (Max) FCFA</Label>
              <Input
                type="number"
                placeholder="Max"
                value={filterMaxRecettes}
                onChange={(e) => setFilterMaxRecettes(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Dépenses (Min) FCFA</Label>
              <Input
                type="number"
                placeholder="Min"
                value={filterMinDepenses}
                onChange={(e) => setFilterMinDepenses(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">Dépenses (Max) FCFA</Label>
              <Input
                type="number"
                placeholder="Max"
                value={filterMaxDepenses}
                onChange={(e) => setFilterMaxDepenses(e.target.value)}
                min="0"
              />
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Indicateur de résultats filtrés */}
      {(filterType !== 'all' || filterStatus !== 'all' || filterProprietaire !== 'all' || filterModele !== 'all' || 
        filterMinTrips || filterMaxTrips || filterMinRecettes || filterMaxRecettes || filterMinDepenses || filterMaxDepenses) && (
        <div className="bg-muted/50 rounded-lg px-4 py-2 border border-primary/10">
          <p className="text-sm font-medium text-primary">
            <span className="font-bold">{filteredTrucks.length}</span> camion(s) trouvé(s) sur {trucks.length}
          </p>
        </div>
      )}

      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20">
          <CardTitle className="flex items-center gap-2">
            🚛 Liste des Camions {filteredTrucks.length !== trucks.length && `(${filteredTrucks.length} résultat${filteredTrucks.length > 1 ? 's' : ''})`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Immatriculation</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Propriétaire</TableHead>
                <TableHead>Trajets</TableHead>
                <TableHead>Mise en circulation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrucks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Aucun camion ne correspond aux critères de filtrage sélectionnés
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrucks.map((truck) => (
                <TableRow key={truck.id} className="hover:bg-muted/50 transition-colors duration-200">
                  <TableCell className="font-semibold">{truck.immatriculation}</TableCell>
                  <TableCell>{truck.modele}</TableCell>
                  <TableCell className="capitalize">{truck.type}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant={truck.statut === 'actif' ? 'default' : 'secondary'}
                        className={truck.statut === 'actif' ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : ''}
                      >
                        {truck.statut}
                      </Badge>
                      {isTruckInUse(truck.id, trips) && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 text-xs">
                          Indisponible
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {truck.proprietaireId ? (
                      <span className="text-sm">
                        {thirdParties?.find(tp => tp.id === truck.proprietaireId)?.nom || '-'}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-primary">
                        {calculateTruckStats(truck.id, trips, expenses).tripsCount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        trajet{calculateTruckStats(truck.id, trips, expenses).tripsCount > 1 ? 's' : ''}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{new Date(truck.dateMiseEnCirculation).toLocaleDateString('fr-FR')}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {truck.photo && (
                        <Button size="sm" variant="outline" onClick={() => setViewingTruck(truck)} className="hover:shadow-md transition-all duration-200">
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleEdit(truck)} className="hover:shadow-md transition-all duration-200">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(truck.id)} className="hover:shadow-md transition-all duration-200">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de visualisation de la photo */}
      <Dialog open={!!viewingTruck} onOpenChange={(open) => !open && setViewingTruck(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Photo du camion - {viewingTruck?.immatriculation}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {viewingTruck?.photo && (
              <div className="relative w-full">
                <img 
                  src={viewingTruck.photo} 
                  alt={`Camion ${viewingTruck.immatriculation}`}
                  className="w-full h-auto rounded-lg object-contain max-h-[70vh] border-2 border-border"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Immatriculation</p>
                <p className="text-lg font-semibold">{viewingTruck?.immatriculation}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Modèle</p>
                <p className="text-lg font-semibold">{viewingTruck?.modele}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Type</p>
                <p className="text-lg font-semibold capitalize">{viewingTruck?.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Propriétaire</p>
                <p className="text-lg font-semibold">
                  {viewingTruck?.proprietaireId 
                    ? (thirdParties?.find(tp => tp.id === viewingTruck.proprietaireId)?.nom || '-')
                    : <span className="text-muted-foreground">Aucun</span>
                  }
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <div className="flex flex-col gap-1 mt-1">
                  <Badge variant={viewingTruck?.statut === 'actif' ? 'default' : 'secondary'}>
                    {viewingTruck?.statut}
                  </Badge>
                  {viewingTruck && isTruckInUse(viewingTruck.id, trips) && (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 text-xs">
                      Indisponible
                    </Badge>
                  )}
                </div>
              </div>
              {viewingTruck && (() => {
                const stats = calculateTruckStats(viewingTruck.id, trips, expenses);
                return (
                  <div className="col-span-2 space-y-3">
                    {/* Statistiques principales */}
                    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-4 border border-primary/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/20 rounded-lg">
                          <Route className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground">Nombre de trajets</p>
                          <p className="text-2xl font-bold text-primary">
                            {stats.tripsCount}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Trajets terminés
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recette totale - Section dédiée */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-lg p-4 border-2 border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-200 dark:bg-green-900 rounded-lg">
                            <DollarSign className="h-5 w-5 text-green-700 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-green-700 dark:text-green-400">Recette totale</p>
                            <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                              {stats.revenue.toLocaleString('fr-FR')} FCFA
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Revenus générés par ce camion
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dépenses et bénéfice */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Dépenses</p>
                        <p className="text-lg font-bold text-red-700 dark:text-red-400">
                          {stats.expenses.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <div className={`rounded-lg p-3 border ${stats.profit >= 0 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'}`}>
                        <p className={`text-xs font-medium mb-1 ${stats.profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                          Bénéfice net
                        </p>
                        <p className={`text-lg font-bold ${stats.profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                          {stats.profit.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
