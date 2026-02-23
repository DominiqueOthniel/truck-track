import { useMemo, useState } from 'react';
import { useApp, Trip, TripStatus } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, MapPin, Route, CheckCircle, Clock, XCircle, FileText, Filter, X, Search, Download, Eye, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { canDeleteTrip, generateInvoiceNumber as genInvoiceNum, calculateTripStats } from '@/lib/sync-utils';
import CityPicker, { getCityDistance, CAMEROON_CITIES } from '@/components/CityPicker';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { exportToExcel, exportToPrintablePDF } from '@/lib/export-utils';
import { EMOJI } from '@/lib/emoji-palette';

export default function Trips() {
  const { trips, trucks, drivers, invoices, expenses, thirdParties, createTrip, updateTrip, deleteTrip, createInvoice } = useApp();
  const { canCreate, canDeleteFinancial } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isOriginPickerOpen, setIsOriginPickerOpen] = useState(false);
  const [isDestinationPickerOpen, setIsDestinationPickerOpen] = useState(false);
  const [isExpensesDialogOpen, setIsExpensesDialogOpen] = useState(false);
  const [selectedTripForExpenses, setSelectedTripForExpenses] = useState<Trip | null>(null);
  
  // États pour les filtres
  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterDestination, setFilterDestination] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<TripStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    tracteurId: '',
    remorqueuseId: '',
    origine: '',
    destination: '',
    origineLat: undefined as number | undefined,
    origineLng: undefined as number | undefined,
    destinationLat: undefined as number | undefined,
    destinationLng: undefined as number | undefined,
    chauffeurId: '',
    dateDepart: '',
    dateArrivee: '',
    recette: 0,
    prefinancement: 0,
    client: '',
    marchandise: '',
    description: '',
    statut: 'planifie' as TripStatus,
  });

  // Obtenir les camions déjà en mission (trajets en cours ou planifiés)
  const getTrucksInMission = () => {
    const activeTrips = trips.filter(t => t.statut === 'en_cours' || t.statut === 'planifie');
    const truckIdsInMission = new Set<string>();
    
    activeTrips.forEach(trip => {
      if (trip.tracteurId) truckIdsInMission.add(trip.tracteurId);
      if (trip.remorqueuseId) truckIdsInMission.add(trip.remorqueuseId);
    });
    
    return truckIdsInMission;
  };

  const trucksInMission = getTrucksInMission();

  // Filtrer les tracteurs disponibles (actifs ET pas en mission)
  const tracteurs = trucks.filter(t => 
    t.type === 'tracteur' && 
    t.statut === 'actif' && 
    !trucksInMission.has(t.id)
  );

  // Filtrer les remorqueuses disponibles (actives ET pas en mission)
  const remorqueuses = trucks.filter(t => 
    t.type === 'remorqueuse' && 
    t.statut === 'actif' && 
    !trucksInMission.has(t.id)
  );

  // Obtenir les chauffeurs déjà en mission (trajets en cours ou planifiés)
  const getDriversInMission = () => {
    const activeTrips = trips.filter(t => t.statut === 'en_cours' || t.statut === 'planifie');
    const driverIdsInMission = new Set<string>();
    
    activeTrips.forEach(trip => {
      if (trip.chauffeurId) driverIdsInMission.add(trip.chauffeurId);
    });
    
    return driverIdsInMission;
  };

  const driversInMission = getDriversInMission();

  // Filtrer les chauffeurs disponibles (pas en mission)
  const availableDrivers = drivers.filter(d => !driversInMission.has(d.id));

  const resetForm = () => {
    setFormData({
      tracteurId: '',
      remorqueuseId: '',
      origine: '',
      destination: '',
      origineLat: undefined,
      origineLng: undefined,
      destinationLat: undefined,
      destinationLng: undefined,
      chauffeurId: '',
      dateDepart: '',
      dateArrivee: '',
      recette: 0,
      prefinancement: 0,
      client: '',
      marchandise: '',
      description: '',
      statut: 'planifie' as TripStatus,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tracteurId && !formData.remorqueuseId) {
      toast.error('Veuillez sélectionner au moins un tracteur ou une remorqueuse');
      return;
    }

    if (!formData.origine || !formData.destination) {
      toast.error('Veuillez remplir l\'origine et la destination');
      return;
    }

    if (!formData.chauffeurId) {
      toast.error('Veuillez sélectionner un chauffeur');
      return;
    }

    if (!formData.dateDepart) {
      toast.error('Veuillez sélectionner la date de départ');
      return;
    }

    try {
      await createTrip({
        origine: formData.origine,
        destination: formData.destination,
        origineLat: formData.origineLat,
        origineLng: formData.origineLng,
        destinationLat: formData.destinationLat,
        destinationLng: formData.destinationLng,
        chauffeurId: formData.chauffeurId,
        dateDepart: formData.dateDepart,
        dateArrivee: formData.dateArrivee || undefined,
        recette: formData.recette,
        prefinancement: formData.prefinancement > 0 ? formData.prefinancement : undefined,
        tracteurId: formData.tracteurId || undefined,
        remorqueuseId: formData.remorqueuseId || undefined,
        client: formData.client || undefined,
        marchandise: formData.marchandise || undefined,
        description: formData.description || undefined,
        statut: 'planifie',
      });
      toast.success('Trajet ajouté avec succès');
      setIsDialogOpen(false);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    }
  };

  const getTruckLabel = (id?: string) => {
    if (!id) return '-';
    const truck = trucks.find(t => t.id === id);
    return truck ? truck.immatriculation : '-';
  };

  const getDriverLabel = (id: string) => {
    const driver = drivers.find(d => d.id === id);
    return driver ? `${driver.prenom} ${driver.nom}` : '-';
  };

  const handleUpdateStatus = async (tripId: string, newStatus: TripStatus, currentStatus: TripStatus) => {
    const statusOrder: TripStatus[] = ['planifie', 'en_cours', 'termine', 'annule'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const newIndex = statusOrder.indexOf(newStatus);

    if (newIndex < currentIndex && newStatus !== 'annule') {
      toast.error('Vous ne pouvez pas revenir à un statut antérieur');
      return;
    }

    if (currentStatus === 'planifie' && newStatus === 'termine') {
      toast.error('Vous devez d\'abord passer par "En cours"');
      return;
    }

    if (currentStatus === 'termine') {
      toast.error('Un trajet terminé ne peut pas être modifié');
      return;
    }

    if (currentStatus === 'annule' && newStatus !== 'annule') {
      toast.error('Un trajet annulé ne peut pas être modifié');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const trip = trips.find(t => t.id === tripId);
    const payload = newStatus === 'termine' ? { statut: newStatus, dateArrivee: today } : { statut: newStatus };

    try {
      await updateTrip(tripId, payload);
      toast.success(newStatus === 'annule' ? 'Trajet annulé' : newStatus === 'termine' ? 'Trajet terminé' : 'Statut mis à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteTrip = async (tripId: string) => {
    if (!canDeleteTrip(tripId, invoices)) {
      toast.error('Impossible de supprimer ce trajet : une facture y est associée. Supprimez d\'abord la facture.');
      return;
    }

    const trip = trips.find(t => t.id === tripId);
    if (trip && confirm(`Êtes-vous sûr de vouloir supprimer le trajet ${trip.origine} → ${trip.destination} ?`)) {
      try {
        await deleteTrip(tripId);
        toast.success('Trajet supprimé');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      }
    }
  };

  const handleCreateInvoice = async (tripId: string) => {
    const existingInvoice = invoices.find(inv => inv.trajetId === tripId);
    if (existingInvoice) {
      toast.error(`Une facture existe déjà pour ce trajet (${existingInvoice.numero})`);
      return;
    }

    const trip = trips.find(t => t.id === tripId);
    if (!trip) return;

    if (trip.recette <= 0) {
      toast.error('Impossible de créer une facture : la recette doit être supérieure à 0 FCFA');
      return;
    }

    try {
      await createInvoice({
        numero: genInvoiceNum(invoices),
        trajetId: tripId,
        statut: 'en_attente',
        montantHT: trip.recette,
        tva: 0,
        tps: 0,
        montantTTC: trip.recette,
        montantPaye: 0,
        dateCreation: new Date().toISOString().split('T')[0],
      });
      toast.success(`Facture créée avec succès pour le trajet ${trip.origine} → ${trip.destination}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    }
  };

  const hasInvoice = (tripId: string) => {
    return invoices.some(inv => inv.trajetId === tripId);
  };

  const getStatusBadge = (statut: TripStatus) => {
    const colors = {
      planifie: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
      en_cours: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
      termine: 'bg-green-500/10 text-green-700 dark:text-green-400',
      annule: 'bg-red-500/10 text-red-700 dark:text-red-400',
    };
    const labels = {
      planifie: 'Planifié',
      en_cours: 'En cours',
      termine: 'Terminé',
      annule: 'Annulé',
    };
    return (
      <Badge className={colors[statut]}>
        {labels[statut]}
      </Badge>
    );
  };

  // Extraire toutes les villes uniques depuis les trajets
  const allOrigins = useMemo(
    () => Array.from(new Set(trips.map(t => t.origine).filter(Boolean))).sort(),
    [trips],
  );
  const allDestinations = useMemo(
    () => Array.from(new Set(trips.map(t => t.destination).filter(Boolean))).sort(),
    [trips],
  );
  
  // Appliquer les filtres
  const filteredTrips = useMemo(
    () =>
      trips.filter(trip => {
        // Filtre par origine
        if (filterOrigin !== 'all' && trip.origine !== filterOrigin) return false;
        
        // Filtre par destination
        if (filterDestination !== 'all' && trip.destination !== filterDestination) return false;
        
        // Filtre par statut
        if (filterStatus !== 'all' && trip.statut !== filterStatus) return false;
        
        // Recherche générale (client, marchandise, description, itinéraire)
        if (searchTerm) {
          const search = searchTerm.toLowerCase();
          const matchesClient = trip.client?.toLowerCase().includes(search);
          const matchesMarchandise = trip.marchandise?.toLowerCase().includes(search);
          const matchesDescription = trip.description?.toLowerCase().includes(search);
          const matchesItineraire = `${trip.origine} → ${trip.destination}`.toLowerCase().includes(search);
          const matchesChauffeur = getDriverLabel(trip.chauffeurId).toLowerCase().includes(search);
          
          if (!matchesClient && !matchesMarchandise && !matchesDescription && !matchesItineraire && !matchesChauffeur) {
            return false;
          }
        }
        
        return true;
      }),
    [trips, filterOrigin, filterDestination, filterStatus, searchTerm],
  );

  const completedTrips = trips.filter(t => t.statut === 'termine').length;
  const ongoingTrips = trips.filter(t => t.statut === 'en_cours').length;
  const plannedTrips = trips.filter(t => t.statut === 'planifie').length;
  // Calculer les revenus à partir des montants payés uniquement
  const totalRevenue = trips.filter(t => t.statut === 'termine').reduce((sum, t) => {
    const tripInvoices = invoices.filter(inv => inv.trajetId === t.id);
    const paidAmount = tripInvoices.reduce((paid, inv) => paid + (inv.montantPaye || 0), 0);
    return sum + paidAmount;
  }, 0);
  
  const filtersDescription = useMemo(() => {
    const parts: string[] = [];
    parts.push(`Origine: ${filterOrigin === 'all' ? 'Toutes' : filterOrigin}`);
    parts.push(`Destination: ${filterDestination === 'all' ? 'Toutes' : filterDestination}`);
    parts.push(
      `Statut: ${
        filterStatus === 'all'
          ? 'Tous'
          : filterStatus === 'planifie'
          ? 'Planifié'
          : filterStatus === 'en_cours'
          ? 'En cours'
          : filterStatus === 'termine'
          ? 'Terminé'
          : 'Annulé'
      }`,
    );
    if (searchTerm) {
      parts.push(`Recherche: "${searchTerm}"`);
    }
    return parts.join(' | ');
  }, [filterOrigin, filterDestination, filterStatus, searchTerm]);

  const handleExportTripsExcel = () => {
    if (filteredTrips.length === 0) {
      return;
    }

    exportToExcel({
      title: 'Trajets filtrés',
      fileName: 'trajets_filtrés.xlsx',
      sheetName: 'Trajets',
      filtersDescription,
      columns: [
        { header: 'Itinéraire', value: (t) => `${t.origine} → ${t.destination}` },
        { header: 'Client', value: (t) => t.client || '-' },
        { header: 'Chauffeur', value: (t) => getDriverLabel(t.chauffeurId) },
        { header: 'Statut', value: (t) => t.statut },
        { header: 'Départ', value: (t) => t.dateDepart },
        { header: 'Arrivée', value: (t) => t.dateArrivee || '' },
        { header: 'Recette (FCFA)', value: (t) => t.recette },
      ],
      rows: filteredTrips,
    });
  };

  const handleExportTripsPDF = () => {
    if (filteredTrips.length === 0) {
      return;
    }

    // Calculer les totaux
    const totalRecettes = filteredTrips.reduce((sum, t) => sum + t.recette, 0);
    const trajetsTermines = filteredTrips.filter(t => t.statut === 'termine').length;
    const trajetsEnCours = filteredTrips.filter(t => t.statut === 'en_cours').length;
    const trajetsPlanifies = filteredTrips.filter(t => t.statut === 'planifie').length;

    exportToPrintablePDF({
      title: 'Liste des Trajets',
      fileName: `trajets_${new Date().toISOString().split('T')[0]}.pdf`,
      filtersDescription,
      // Couleurs thématiques pour les trajets (vert/teal)
      headerColor: '#0d9488',
      headerTextColor: '#ffffff',
      evenRowColor: '#f0fdfa',
      oddRowColor: '#ffffff',
      accentColor: '#0d9488',
      totals: [
        { label: 'Total Trajets', value: filteredTrips.length, style: 'neutral', icon: EMOJI.camion },
        { label: 'Terminés', value: trajetsTermines, style: 'positive', icon: '✅' },
        { label: 'En cours', value: trajetsEnCours, style: 'neutral', icon: '🔄' },
        { label: 'Planifiés', value: trajetsPlanifies, style: 'neutral', icon: EMOJI.date },
        { label: 'TOTAL RECETTES', value: `+${totalRecettes.toLocaleString('fr-FR')} FCFA`, style: 'positive', icon: EMOJI.argent },
      ],
      columns: [
        { header: 'Itinéraire', value: (t) => `${EMOJI.adresse} ${t.origine} → ${t.destination}` },
        { header: 'Client', value: (t) => t.client || '-' },
        { header: 'Chauffeur', value: (t) => `${EMOJI.personne} ${getDriverLabel(t.chauffeurId)}` },
        { header: 'Statut', value: (t) => {
          const statuts: Record<string, string> = {
            'planifie': `${EMOJI.date} Planifié`,
            'en_cours': `${EMOJI.camion} En cours`,
            'termine': `${EMOJI.succes} Terminé`,
            'annule': `${EMOJI.annule} Annulé`
          };
          return statuts[t.statut] || t.statut;
        }},
        { header: 'Départ', value: (t) => new Date(t.dateDepart).toLocaleDateString('fr-FR') },
        {
          header: 'Arrivée',
          value: (t) => (t.dateArrivee ? new Date(t.dateArrivee).toLocaleDateString('fr-FR') : '-'),
        },
        { 
          header: 'Recette (FCFA)', 
          value: (t) => `+${t.recette.toLocaleString('fr-FR')}`,
          cellStyle: (t) => t.recette > 0 ? 'positive' : 'neutral'
        },
      ],
      rows: filteredTrips,
    });
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setFilterOrigin('all');
    setFilterDestination('all');
    setFilterStatus('all');
    setSearchTerm('');
  };
  
  // Vérifier si des filtres sont actifs
  const hasActiveFilters = filterOrigin !== 'all' || filterDestination !== 'all' || filterStatus !== 'all' || searchTerm !== '';

  return (
    <div className="space-y-6 p-1">
      {/* En-tête professionnel */}
      <PageHeader
        title="Gestion des Trajets"
        description="Planifiez et suivez tous vos trajets de transport"
        icon={Route}
        gradient="from-green-500/20 via-cyan-500/10 to-transparent"
        stats={[
          {
            label: 'Terminés',
            value: completedTrips,
            icon: <CheckCircle className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'En cours',
            value: ongoingTrips,
            icon: <Clock className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'Planifiés',
            value: plannedTrips,
            icon: <MapPin className="h-4 w-4" />,
            color: 'text-yellow-600 dark:text-yellow-400'
          },
          {
            label: 'Recettes',
            value: totalRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 }),
            icon: <Route className="h-4 w-4" />,
            color: 'text-purple-600 dark:text-purple-400'
          }
        ]}
        actions={
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="shadow-sm"
            onClick={handleExportTripsPDF}
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            className="shadow-sm"
            onClick={handleExportTripsExcel}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            {canCreate && (
            <DialogTrigger asChild>
                <Button className="shadow-md hover:shadow-lg transition-all duration-300">
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un trajet
              </Button>
            </DialogTrigger>
            )}
            <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un trajet</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tracteur">
                    Tracteur (optionnel) 
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({tracteurs.length} disponible{tracteurs.length > 1 ? 's' : ''})
                    </span>
                  </Label>
                  <Select value={formData.tracteurId || 'none'} onValueChange={(value) => {
                    const tracteurId = value === 'none' ? '' : value;
                    // Trouver le chauffeur attitré au tracteur sélectionné
                    const selectedTruck = trucks.find(t => t.id === tracteurId);
                    const chauffeurAttitreId = selectedTruck?.chauffeurId || '';
                    
                    // Si le tracteur a un chauffeur attitré, le sélectionner automatiquement
                    setFormData({ 
                      ...formData, 
                      tracteurId,
                      chauffeurId: chauffeurAttitreId || formData.chauffeurId 
                    });
                    
                    if (chauffeurAttitreId) {
                      const chauffeur = drivers.find(d => d.id === chauffeurAttitreId);
                      if (chauffeur) {
                        toast.info(`Chauffeur attitré sélectionné : ${chauffeur.prenom} ${chauffeur.nom}`);
                      }
                    }
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {tracteurs.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          Aucun tracteur disponible
                        </div>
                      ) : (
                        tracteurs.map(t => {
                          const chauffeurAttitre = t.chauffeurId ? drivers.find(d => d.id === t.chauffeurId) : null;
                          return (
                            <SelectItem key={t.id} value={t.id}>
                              {t.immatriculation} - {t.modele}
                              {chauffeurAttitre && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({EMOJI.personne} {chauffeurAttitre.prenom} {chauffeurAttitre.nom})
                                </span>
                              )}
                            </SelectItem>
                          );
                        })
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="remorqueuse">
                    Remorqueuse (optionnel)
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({remorqueuses.length} disponible{remorqueuses.length > 1 ? 's' : ''})
                    </span>
                  </Label>
                  <Select value={formData.remorqueuseId || 'none'} onValueChange={(value) => setFormData({ ...formData, remorqueuseId: value === 'none' ? '' : value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {remorqueuses.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          Aucune remorqueuse disponible
                        </div>
                      ) : (
                        remorqueuses.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.immatriculation} - {t.modele}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="origine">Origine *</Label>
                  <div className="flex gap-2">
                  <Input
                    id="origine"
                    value={formData.origine}
                    onChange={(e) => setFormData({ ...formData, origine: e.target.value })}
                      placeholder="Entrer ou sélectionner"
                    required
                  />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsOriginPickerOpen(true)}
                      title="Choisir sur la carte"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="destination">Destination *</Label>
                  <div className="flex gap-2">
                  <Input
                    id="destination"
                    value={formData.destination}
                    onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="Entrer ou sélectionner"
                    required
                  />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsDestinationPickerOpen(true)}
                      title="Choisir sur la carte"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Coordonnées optionnelles pour localisation précise (GPS / simulation) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg border border-dashed bg-muted/30">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Coordonnées origine (optionnel)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={formData.origineLat ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, origineLat: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={formData.origineLng ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, origineLng: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Coordonnées destination (optionnel)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="any"
                      placeholder="Latitude"
                      value={formData.destinationLat ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, destinationLat: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      step="any"
                      placeholder="Longitude"
                      value={formData.destinationLng ?? ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, destinationLng: e.target.value === '' ? undefined : parseFloat(e.target.value) }))}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Afficher la distance si origine et destination sont définies */}
              {formData.origine && formData.destination && formData.origine !== formData.destination && (
                <div className="bg-muted/50 p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Distance estimée :</span>
                    <Badge variant="outline" className="text-sm font-semibold">
                      {EMOJI.adresse} ~{getCityDistance(formData.origine, formData.destination)} km
                    </Badge>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="chauffeur">
                  Chauffeur *
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({availableDrivers.length} disponible{availableDrivers.length > 1 ? 's' : ''})
                  </span>
                </Label>
                <Select value={formData.chauffeurId} onValueChange={(value) => setFormData({ ...formData, chauffeurId: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un chauffeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDrivers.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground text-center">
                        <p className="mb-2">{EMOJI.alerte} Aucun chauffeur disponible</p>
                        <p className="text-xs">
                          Tous les chauffeurs sont en mission.<br/>
                          Terminez ou annulez un trajet pour libérer un chauffeur.
                        </p>
                      </div>
                    ) : (
                      availableDrivers.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.prenom} {d.nom}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

                <div>
                <Label htmlFor="dateDepart">Date de départ *</Label>
                  <Input
                    id="dateDepart"
                    type="date"
                    value={formData.dateDepart}
                    onChange={(e) => setFormData({ ...formData, dateDepart: e.target.value })}
                    required
                  />
                </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="client">Client (optionnel)</Label>
                  <Select 
                    value={formData.client || 'none'} 
                    onValueChange={(value) => setFormData({ ...formData, client: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun client</SelectItem>
                      {thirdParties
                        .filter(tp => tp.type === 'client')
                        .map(client => (
                          <SelectItem key={client.id} value={client.nom}>
                            {client.nom}
                            {client.telephone && ` - ${client.telephone}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vous pouvez ajouter des clients dans la section "Tiers"
                  </p>
                </div>

                <div>
                  <Label htmlFor="marchandise">Marchandise (optionnel)</Label>
                  <Input
                    id="marchandise"
                    value={formData.marchandise}
                    onChange={(e) => setFormData({ ...formData, marchandise: e.target.value })}
                    placeholder="Type de marchandise"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recette">Recette (FCFA) *</Label>
                  <NumberInput
                    id="recette"
                    min={0}
                    value={formData.recette}
                    onChange={(value) => setFormData({ ...formData, recette: value })}
                    required
                    placeholder="Montant de la recette"
                  />
                </div>
                <div>
                  <Label htmlFor="prefinancement">Préfinancement (FCFA) (optionnel)</Label>
                  <NumberInput
                    id="prefinancement"
                    min={0}
                    value={formData.prefinancement}
                    onChange={(value) => setFormData({ ...formData, prefinancement: value || 0 })}
                    placeholder="Montant de préfinancement"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Avance versée avant le trajet</p>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Détails supplémentaires"
                  rows={3}
                />
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
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
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
              <Label htmlFor="search">Recherche générale</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Rechercher par client, marchandise, description, itinéraire ou chauffeur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Filtre par origine */}
              <div>
                <Label htmlFor="filter-origin">Origine</Label>
                <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les origines" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les origines</SelectItem>
                    {CAMEROON_CITIES.map(city => (
                      <SelectItem key={city.name} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                    {/* Ajouter les villes personnalisées qui ne sont pas dans la liste */}
                    {allOrigins.filter(origin => !CAMEROON_CITIES.find(c => c.name === origin)).map(origin => (
                      <SelectItem key={origin} value={origin}>
                        {origin}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtre par destination */}
              <div>
                <Label htmlFor="filter-destination">Destination</Label>
                <Select value={filterDestination} onValueChange={setFilterDestination}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les destinations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les destinations</SelectItem>
                    {CAMEROON_CITIES.map(city => (
                      <SelectItem key={city.name} value={city.name}>
                        {city.name}
                      </SelectItem>
                    ))}
                    {/* Ajouter les villes personnalisées qui ne sont pas dans la liste */}
                    {allDestinations.filter(dest => !CAMEROON_CITIES.find(c => c.name === dest)).map(dest => (
                      <SelectItem key={dest} value={dest}>
                        {dest}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Filtre par statut */}
              <div>
                <Label htmlFor="filter-status">Statut</Label>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as TripStatus | 'all')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="planifie">Planifié</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="termine">Terminé</SelectItem>
                    <SelectItem value="annule">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Affichage du nombre de résultats */}
            {hasActiveFilters && (
              <div className="bg-muted/50 rounded-lg px-4 py-2 border border-primary/10">
                <p className="text-sm font-medium text-primary">
                  <span className="font-bold">{filteredTrips.length}</span> trajet(s) trouvé(s) sur {trips.length}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader className="bg-gradient-to-br from-background to-muted/20">
              <CardTitle className="flex items-center gap-2">
            🚚 Liste des Trajets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[160px]">Itinéraire</TableHead>
                <TableHead className="min-w-[120px]">Client</TableHead>
                <TableHead className="min-w-[130px]">Chauffeur</TableHead>
                <TableHead className="min-w-[120px]">Statut</TableHead>
                <TableHead className="min-w-[90px]">Départ</TableHead>
                <TableHead className="min-w-[90px]">Arrivée</TableHead>
                <TableHead className="text-right min-w-[110px]">Recette</TableHead>
                <TableHead className="text-right min-w-[120px]">Préfinancement</TableHead>
                <TableHead className="text-right min-w-[110px]">Dépenses</TableHead>
                <TableHead className="text-right min-w-[110px]">Solde</TableHead>
                <TableHead className="text-right min-w-[160px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center text-muted-foreground">
                    {trips.length === 0 
                      ? 'Aucun trajet enregistré'
                      : hasActiveFilters
                        ? 'Aucun trajet ne correspond aux filtres sélectionnés'
                        : 'Aucun trajet enregistré'
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => (
                  <TableRow key={trip.id} className="hover:bg-muted/50 transition-colors duration-200">
                    <TableCell className="font-medium">
                      <div>{trip.origine} → {trip.destination}</div>
                      {trip.description && <div className="text-xs text-muted-foreground mt-1">{trip.description}</div>}
                    </TableCell>
                    <TableCell>{trip.client || '-'}</TableCell>
                    <TableCell>{getDriverLabel(trip.chauffeurId)}</TableCell>
                    <TableCell>{getStatusBadge(trip.statut)}</TableCell>
                    <TableCell>{new Date(trip.dateDepart).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>
                      {trip.dateArrivee 
                        ? new Date(trip.dateArrivee).toLocaleDateString('fr-FR') 
                        : <span className="text-muted-foreground text-xs">À définir</span>
                      }
                    </TableCell>
                    <TableCell className="text-right font-semibold text-accent">{trip.recette.toLocaleString('fr-FR')} FCFA</TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const stats = calculateTripStats(trip.id, expenses, trip, invoices);
                        return stats.prefinancement > 0 ? (
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {stats.prefinancement.toLocaleString('fr-FR')} FCFA
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const stats = calculateTripStats(trip.id, expenses, trip, invoices);
                        return stats.expenses > 0 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {stats.expenses.toLocaleString('fr-FR')} FCFA
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({stats.expensesCount} dépense{stats.expensesCount > 1 ? 's' : ''})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const stats = calculateTripStats(trip.id, expenses, trip, invoices);
                        const soldeColor = stats.solde >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
                        return (
                          <span className={`font-bold ${soldeColor}`}>
                            {stats.solde.toLocaleString('fr-FR')} FCFA
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Select 
                          value={trip.statut} 
                          onValueChange={(value) => handleUpdateStatus(trip.id, value as TripStatus, trip.statut)}
                          disabled={trip.statut === 'termine' || trip.statut === 'annule'}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planifie" disabled={trip.statut !== 'planifie'}>Planifié</SelectItem>
                            <SelectItem value="en_cours" disabled={trip.statut === 'termine' || trip.statut === 'annule'}>En cours</SelectItem>
                            <SelectItem value="termine" disabled={trip.statut === 'planifie' || trip.statut === 'termine' || trip.statut === 'annule'}>Terminé</SelectItem>
                            <SelectItem value="annule" disabled={trip.statut === 'termine' || trip.statut === 'annule'}>Annulé</SelectItem>
                          </SelectContent>
                        </Select>
                        {(() => {
                          const stats = calculateTripStats(trip.id, expenses, trip, invoices);
                          return stats.expensesCount > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTripForExpenses(trip);
                                setIsExpensesDialogOpen(true);
                              }}
                              className="h-8 w-8 p-0"
                              title="Voir les dépenses de ce trajet"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          );
                        })()}
                        {canCreate && !hasInvoice(trip.id) && trip.recette > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateInvoice(trip.id)}
                            className="h-8 w-8 p-0"
                            title="Créer une facture pour ce trajet"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeleteFinancial && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="h-8 w-8 p-0"
                          title="Supprimer le trajet"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        )}
                </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
            </CardContent>
          </Card>

      {/* Sélecteur de ville pour l'origine (nom + coordonnées pour localisation précise) */}
      <CityPicker
        open={isOriginPickerOpen}
        onClose={() => setIsOriginPickerOpen(false)}
        onSelectCity={(city, coords) => setFormData(prev => ({
          ...prev,
          origine: city,
          origineLat: coords?.lat,
          origineLng: coords?.lng,
        }))}
        title="Sélectionner la ville d'origine"
        selectedCity={formData.origine}
      />

      {/* Sélecteur de ville pour la destination (nom + coordonnées pour localisation précise) */}
      <CityPicker
        open={isDestinationPickerOpen}
        onClose={() => setIsDestinationPickerOpen(false)}
        onSelectCity={(city, coords) => setFormData(prev => ({
          ...prev,
          destination: city,
          destinationLat: coords?.lat,
          destinationLng: coords?.lng,
        }))}
        title="Sélectionner la ville de destination"
        selectedCity={formData.destination}
      />

      {/* Dialog de consultation des dépenses d'un trajet */}
      <Dialog open={isExpensesDialogOpen} onOpenChange={setIsExpensesDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dépenses du trajet</DialogTitle>
          </DialogHeader>
          {selectedTripForExpenses && (() => {
            const tripExpenses = expenses.filter(e => e.tripId === selectedTripForExpenses.id);
            const stats = calculateTripStats(selectedTripForExpenses.id, expenses, selectedTripForExpenses, invoices);
            
            return (
              <div className="space-y-4">
                {/* Informations du trajet */}
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Itinéraire:</span>
                      <p className="font-semibold">{selectedTripForExpenses.origine} → {selectedTripForExpenses.destination}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Recette:</span>
                      <p className="font-semibold text-green-600 dark:text-green-400">{stats.recette.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Préfinancement:</span>
                      <p className="font-semibold text-blue-600 dark:text-blue-400">{stats.prefinancement.toLocaleString('fr-FR')} FCFA</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Solde:</span>
                      <p className={`font-bold ${stats.solde >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {stats.solde.toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  </div>
                </div>

                {/* Résumé des dépenses */}
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="font-semibold">Total des dépenses: {stats.expenses.toLocaleString('fr-FR')} FCFA</span>
                    </div>
                    <Badge variant="outline" className="bg-primary/10">
                      {stats.expensesCount} dépense{stats.expensesCount > 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                {/* Liste des dépenses */}
                {tripExpenses.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-3">Détail des dépenses</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Catégorie</TableHead>
                          <TableHead>Sous-catégorie</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tripExpenses.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{new Date(expense.date).toLocaleDateString('fr-FR')}</TableCell>
                            <TableCell className="font-medium">{expense.categorie}</TableCell>
                            <TableCell>{expense.sousCategorie || '-'}</TableCell>
                            <TableCell>{expense.description}</TableCell>
                            <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                              {expense.montant.toLocaleString('fr-FR')} FCFA
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Aucune dépense enregistrée pour ce trajet</p>
                  </div>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
