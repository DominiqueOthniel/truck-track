import { useState } from 'react';
import { useApp, Driver } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, TrendingDown, Trash2, Users, UserCheck, DollarSign, Route, Filter, X, Search, FileDown, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { canDeleteDriver, isDriverOnMission, calculateDriverStats } from '@/lib/sync-utils';
import PageHeader from '@/components/PageHeader';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';

export default function Drivers() {
  const { drivers, setDrivers, trips } = useApp();
  const [isAddDriverDialogOpen, setIsAddDriverDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'en_mission' | 'disponible'>('all');
  const [filterSolde, setFilterSolde] = useState<'all' | 'positif' | 'negatif' | 'zero'>('all');
  const [filterMinTrips, setFilterMinTrips] = useState<string>('');
  const [filterMaxTrips, setFilterMaxTrips] = useState<string>('');

  const [driverForm, setDriverForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    cni: '',
    photo: '',
  });

  const [photoPreview, setPhotoPreview] = useState<string>('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        setDriverForm({ ...driverForm, photo: result });
      };
      reader.readAsDataURL(file);
    }
  };

  const resetDriverForm = () => {
    setDriverForm({
      nom: '',
      prenom: '',
      telephone: '',
      cni: '',
      photo: '',
    });
    setPhotoPreview('');
  };


  const handleAddDriver = (e: React.FormEvent) => {
    e.preventDefault();

    const newDriver: Driver = {
      id: Date.now().toString(),
      ...driverForm,
      transactions: [],
    };

    setDrivers([...drivers, newDriver]);
    toast.success('Chauffeur ajouté avec succès');
    setIsAddDriverDialogOpen(false);
    resetDriverForm();
  };

  const handleDeleteDriver = (id: string) => {
    // Vérifier si le chauffeur est en mission
    if (isDriverOnMission(id, trips)) {
      toast.error('Impossible de supprimer ce chauffeur : il est assigné à un trajet en cours ou planifié');
      return;
    }

    if (!canDeleteDriver(id, trips)) {
      toast.error('Impossible de supprimer ce chauffeur : il a des trajets actifs');
      return;
    }

    const driver = drivers.find(d => d.id === id);
    if (driver) {
      const stats = calculateDriverStats(driver);
      const tripsCount = trips.filter(t => t.chauffeurId === id).length;
      
      if (confirm(
        `Êtes-vous sûr de vouloir supprimer ${driver.prenom} ${driver.nom} ?\n\n` +
        `Statistiques :\n` +
        `- ${tripsCount} trajets effectués\n` +
        `- ${stats.apports.toLocaleString('fr-FR')} FCFA d'apports\n` +
        `- ${stats.sorties.toLocaleString('fr-FR')} FCFA de sorties\n` +
        `- Solde: ${stats.balance.toLocaleString('fr-FR')} FCFA\n\n` +
        `L'historique de ses transactions sera perdu.`
      )) {
        setDrivers(drivers.filter(d => d.id !== id));
        toast.success('Chauffeur supprimé');
      }
    }
  };

  const calculateBalance = (driver: Driver) => {
    const apports = driver.transactions
      .filter(t => t.type === 'apport')
      .reduce((sum, t) => sum + t.montant, 0);
    const sorties = driver.transactions
      .filter(t => t.type === 'sortie')
      .reduce((sum, t) => sum + t.montant, 0);
    return apports - sorties;
  };

  // Filtrer les chauffeurs par les infos
  const filteredDrivers = drivers.filter(driver => {
    // Recherche générale
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesPrenom = driver.prenom.toLowerCase().includes(search);
      const matchesNom = driver.nom.toLowerCase().includes(search);
      const matchesTelephone = driver.telephone.includes(search);
      const matchesCni = driver.cni?.toLowerCase().includes(search);
      
      if (!matchesPrenom && !matchesNom && !matchesTelephone && !matchesCni) {
        return false;
      }
    }
    
    // Filtre par statut (en mission / disponible)
    if (filterStatus !== 'all') {
      const onMission = isDriverOnMission(driver.id, trips);
      if (filterStatus === 'en_mission' && !onMission) return false;
      if (filterStatus === 'disponible' && onMission) return false;
    }
    
    // Filtre par solde
    if (filterSolde !== 'all') {
      const balance = calculateBalance(driver);
      if (filterSolde === 'positif' && balance <= 0) return false;
      if (filterSolde === 'negatif' && balance >= 0) return false;
      if (filterSolde === 'zero' && balance !== 0) return false;
    }
    
    // Filtre par nombre de trajets
    const tripsCount = trips.filter(t => t.chauffeurId === driver.id).length;
    if (filterMinTrips && tripsCount < parseInt(filterMinTrips)) return false;
    if (filterMaxTrips && tripsCount > parseInt(filterMaxTrips)) return false;
    
    return true;
  });

  // Calculer les statistiques
  const driversOnMission = drivers.filter(d => isDriverOnMission(d.id, trips)).length;
  const totalBalance = drivers.reduce((sum, d) => sum + calculateBalance(d), 0);
  const positiveBalance = drivers.filter(d => calculateBalance(d) > 0).length;

  // Fonction pour générer la description des filtres
  const getFiltersDescription = () => {
    const filters: string[] = [];
    if (searchTerm) filters.push(`Recherche: "${searchTerm}"`);
    if (filterStatus !== 'all') filters.push(`Statut: ${filterStatus === 'en_mission' ? 'En mission' : 'Disponible'}`);
    if (filterSolde !== 'all') {
      const soldeLabels: Record<string, string> = { positif: 'Positif', negatif: 'Négatif', zero: 'Zéro' };
      filters.push(`Solde: ${soldeLabels[filterSolde]}`);
    }
    if (filterMinTrips) filters.push(`Min trajets: ${filterMinTrips}`);
    if (filterMaxTrips) filters.push(`Max trajets: ${filterMaxTrips}`);
    return filters.length > 0 ? `Filtres appliqués: ${filters.join(', ')}` : undefined;
  };

  // Fonctions d'export
  const handleExportExcel = () => {
    exportToExcel({
      title: 'Liste des Chauffeurs',
      fileName: `chauffeurs_${new Date().toISOString().split('T')[0]}.xlsx`,
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Prénom', value: (d) => d.prenom },
        { header: 'Nom', value: (d) => d.nom },
        { header: 'Téléphone', value: (d) => d.telephone },
        { header: 'CNI', value: (d) => d.cni || '-' },
        { header: 'Statut', value: (d) => isDriverOnMission(d.id, trips) ? 'En mission' : 'Disponible' },
        { header: 'Nb. Trajets', value: (d) => trips.filter(t => t.chauffeurId === d.id).length },
        { header: 'Apports (FCFA)', value: (d) => d.transactions.filter(t => t.type === 'apport').reduce((sum, t) => sum + t.montant, 0) },
        { header: 'Sorties (FCFA)', value: (d) => d.transactions.filter(t => t.type === 'sortie').reduce((sum, t) => sum + t.montant, 0) },
        { header: 'Solde (FCFA)', value: (d) => calculateBalance(d) },
      ],
      rows: filteredDrivers,
    });
    toast.success('Export Excel généré avec succès');
  };

  const handleExportPDF = () => {
    exportToPrintablePDF({
      title: 'Liste des Chauffeurs',
      filtersDescription: getFiltersDescription(),
      columns: [
        { header: 'Prénom', value: (d) => d.prenom },
        { header: 'Nom', value: (d) => d.nom },
        { header: 'Téléphone', value: (d) => d.telephone },
        { header: 'CNI', value: (d) => d.cni || '-' },
        { header: 'Statut', value: (d) => isDriverOnMission(d.id, trips) ? 'En mission' : 'Disponible' },
        { header: 'Nb. Trajets', value: (d) => trips.filter(t => t.chauffeurId === d.id).length },
        { header: 'Solde (FCFA)', value: (d) => calculateBalance(d).toLocaleString('fr-FR') },
      ],
      rows: filteredDrivers,
    });
  };

  return (
    <div className="space-y-6 p-1">
      {/* En-tête professionnel */}
      <PageHeader
        title="Gestion des Chauffeurs"
        description="Gérez vos chauffeurs et leur situation financière"
        icon={Users}
        gradient="from-purple-500/20 via-pink-500/10 to-transparent"
        stats={[
          {
            label: 'Total',
            value: drivers.length,
            icon: <Users className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'En mission',
            value: driversOnMission,
            icon: <UserCheck className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'Solde +',
            value: positiveBalance,
            icon: <TrendingUp className="h-4 w-4" />,
            color: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            label: 'Solde Total',
            value: `${totalBalance.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} FCFA`,
            icon: <DollarSign className="h-4 w-4" />,
            color: totalBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
            <Dialog open={isAddDriverDialogOpen} onOpenChange={(open) => {
              setIsAddDriverDialogOpen(open);
              if (!open) resetDriverForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsAddDriverDialogOpen(true)} className="shadow-md hover:shadow-lg transition-all duration-300">
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un chauffeur
                </Button>
              </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un chauffeur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddDriver} className="space-y-4">
              <div>
                <Label htmlFor="prenom">Prénom</Label>
                <Input
                  id="prenom"
                  value={driverForm.prenom}
                  onChange={(e) => setDriverForm({ ...driverForm, prenom: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  value={driverForm.nom}
                  onChange={(e) => setDriverForm({ ...driverForm, nom: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={driverForm.telephone}
                  onChange={(e) => setDriverForm({ ...driverForm, telephone: e.target.value })}
                  placeholder="+237 6 12 34 56 78"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cni">Numéro de CNI</Label>
                <Input
                  id="cni"
                  value={driverForm.cni}
                  onChange={(e) => setDriverForm({ ...driverForm, cni: e.target.value })}
                  placeholder="CE-123456789"
                />
              </div>
              <div>
                <Label htmlFor="photo">Photo du chauffeur</Label>
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
                      className="w-32 h-32 rounded-full object-cover border-2 border-primary"
                    />
                  </div>
                )}
              </div>
              <Button type="submit" className="w-full">Ajouter</Button>
            </form>
          </DialogContent>
        </Dialog>
          </div>
        }
      />

      {/* Section de filtres */}
      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtres de recherche
            </CardTitle>
            {(searchTerm || filterStatus !== 'all' || filterSolde !== 'all' || filterMinTrips || filterMaxTrips) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterSolde('all');
                  setFilterMinTrips('');
                  setFilterMaxTrips('');
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
              <Label htmlFor="search-drivers" className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Recherche générale
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-drivers"
                  placeholder="Rechercher par nom, prénom, téléphone ou CNI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtres actifs */}
            {(filterStatus !== 'all' || filterSolde !== 'all' || filterMinTrips || filterMaxTrips) && (
              <div className="flex flex-wrap gap-2 pb-2">
                {filterStatus !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    {filterStatus === 'en_mission' ? 'En mission' : 'Disponible'}
                    <button
                      onClick={() => setFilterStatus('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterSolde !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Solde: {filterSolde === 'positif' ? 'Positif' : filterSolde === 'negatif' ? 'Négatif' : 'Zéro'}
                    <button
                      onClick={() => setFilterSolde('all')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterMinTrips && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Min trajets: {filterMinTrips}
                    <button
                      onClick={() => setFilterMinTrips('')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filterMaxTrips && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1.5">
                    Max trajets: {filterMaxTrips}
                    <button
                      onClick={() => setFilterMaxTrips('')}
                      className="ml-2 hover:bg-primary/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
            )}

            {/* Sélecteurs de filtres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Statut</Label>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as 'all' | 'en_mission' | 'disponible')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="en_mission">En mission</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Solde</Label>
                <Select value={filterSolde} onValueChange={(value) => setFilterSolde(value as 'all' | 'positif' | 'negatif' | 'zero')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les soldes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les soldes</SelectItem>
                    <SelectItem value="positif">Solde positif</SelectItem>
                    <SelectItem value="negatif">Solde négatif</SelectItem>
                    <SelectItem value="zero">Solde zéro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Nombre min de trajets</Label>
                <Input
                  type="number"
                  min="0"
                  value={filterMinTrips}
                  onChange={(e) => setFilterMinTrips(e.target.value)}
                  placeholder="Min"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground mb-2">Nombre max de trajets</Label>
                <Input
                  type="number"
                  min="0"
                  value={filterMaxTrips}
                  onChange={(e) => setFilterMaxTrips(e.target.value)}
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredDrivers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? 'Aucun chauffeur ne correspond à votre recherche' : 'Aucun chauffeur enregistré'}
            </p>
          </div>
        ) : (
          filteredDrivers.map((driver) => {
          const balance = calculateBalance(driver);
          const apports = driver.transactions
            .filter(t => t.type === 'apport')
            .reduce((sum, t) => sum + t.montant, 0);
          const sorties = driver.transactions
            .filter(t => t.type === 'sortie')
            .reduce((sum, t) => sum + t.montant, 0);
          const tripsCount = trips.filter(t => t.chauffeurId === driver.id).length;

          return (
            <Card key={driver.id} className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/30 group">
              <CardHeader className="bg-gradient-to-br from-background to-muted/20 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {driver.photo && (
                      <div className="relative">
                        <img 
                          src={driver.photo} 
                          alt={`${driver.prenom} ${driver.nom}`}
                          className="w-16 h-16 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300"
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{driver.prenom} {driver.nom}</CardTitle>
                        {isDriverOnMission(driver.id, trips) && (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">
                            Indisponible
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        📞 {driver.telephone}
                      </p>
                      {driver.cni && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          🪪 CNI: {driver.cni}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                          <Route className="h-3 w-3 mr-1" />
                          {tripsCount} trajet{tripsCount > 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => handleDeleteDriver(driver.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Apports</span>
                      </div>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400">{apports.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-900">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-medium text-red-700 dark:text-red-400">Sorties</span>
                      </div>
                      <p className="text-lg font-bold text-red-700 dark:text-red-400">{sorties.toLocaleString('fr-FR')} FCFA</p>
                  </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-3 border border-primary/20">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">Solde net:</span>
                      <Badge 
                        variant={balance >= 0 ? 'default' : 'destructive'} 
                        className="text-base px-4 py-1.5 shadow-sm"
                      >
                        {balance.toLocaleString('fr-FR')} FCFA
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-muted-foreground">📋 Transactions</p>
                    </div>
                    {driver.transactions.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {driver.transactions.slice().reverse().map(transaction => (
                          <div 
                            key={transaction.id} 
                            className="flex justify-between items-center p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                          >
                            <div className="flex-1 pr-2 min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">
                                {transaction.description}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded whitespace-nowrap ${
                              transaction.type === 'apport' 
                                ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
                                : 'bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                            }`}>
                              {transaction.type === 'apport' ? '↗' : '↙'} {transaction.montant.toLocaleString('fr-FR')} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">
                        Aucune transaction enregistrée
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

    </div>
  );
}
