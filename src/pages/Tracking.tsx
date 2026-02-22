import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MapPin, 
  RefreshCw, 
  Truck as TruckIcon, 
  Route, 
  Clock, 
  Navigation, 
  Loader2,
  ExternalLink,
  X,
  Server,
  Play,
  Gauge
} from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { 
  getAllTruckLocations, 
  TruckLocation, 
  TripInfo,
  getMapUrl,
  getMapUrlWithMarkers,
  saveLocationHistory,
  loadGPSConfig,
} from '@/lib/gps-tracking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EMOJI } from '@/lib/emoji-palette';

export default function Tracking() {
  const { trucks, trips } = useApp();
  const location = useLocation();
  const [locations, setLocations] = useState<TruckLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedTruck, setSelectedTruck] = useState<string>(
    (location.state as { truckId?: string })?.truckId || 'all'
  );
  const [filterInTrip, setFilterInTrip] = useState<string>('all');
  const [gpsMode, setGpsMode] = useState<'simulation' | 'traccar'>('simulation');
  
  // Charger la configuration GPS
  useEffect(() => {
    const config = loadGPSConfig();
    setGpsMode(config.mode as 'simulation' | 'traccar');
  }, []);

  // Charger les configurations GPS (uniquement pour les camions existants)
  const getGPSConfigs = () => {
    const saved = localStorage.getItem('gps_configs');
    if (!saved) return [];
    const configs = JSON.parse(saved);
    return configs.filter((c: any) => c.imei && c.isActive && trucks.some((t) => t.id === c.truckId));
  };

  // Obtenir le trajet actif d'un camion
  const getActiveTrip = (truckId: string) => {
    return trips.find(trip => 
      (trip.tracteurId === truckId || trip.remorqueuseId === truckId) && 
      trip.statut === 'en_cours'
    );
  };

  // Charger les positions
  const loadLocations = async () => {
    setIsLoading(true);
    try {
      const gpsConfigs = getGPSConfigs();
      
      const trucksWithGPS = gpsConfigs.map((config: { truckId: string; imei: string }) => {
        const trip = getActiveTrip(config.truckId);
        
        // Créer l'objet TripInfo si un trajet est en cours
        let tripInfo: TripInfo | undefined;
        if (trip) {
          tripInfo = {
            id: trip.id,
            origine: trip.origine,
            destination: trip.destination,
            origineLat: trip.origineLat,
            origineLng: trip.origineLng,
            destinationLat: trip.destinationLat,
            destinationLng: trip.destinationLng,
            dateDepart: trip.dateDepart,
          };
        }
        
        return {
          truckId: config.truckId,
          imei: config.imei,
          tripInfo,
        };
      });

      const newLocations = await getAllTruckLocations(trucksWithGPS);
      
      // Sauvegarder l'historique pour chaque camion
      newLocations.forEach(location => {
        saveLocationHistory(location.truckId, location);
      });
      
      setLocations(newLocations);
      toast.success(`${newLocations.length} position(s) récupérée(s)`);
    } catch (error) {
      toast.error('Erreur lors de la récupération des positions');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Charger au montage
  useEffect(() => {
    loadLocations();
  }, []);

  // Gérer le rafraîchissement automatique
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadLocations();
      }, 30000); // Rafraîchir toutes les 30 secondes
      setRefreshInterval(interval);
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
  }, [autoRefresh]);

  // Obtenir le camion par ID
  const getTruck = (truckId: string) => {
    return trucks.find(t => t.id === truckId);
  };

  // Supprimer les configs GPS orphelines (camions inexistants) et synchro des libellés
  useEffect(() => {
    const saved = localStorage.getItem('gps_configs');
    if (!saved) return;
    const allConfigs = JSON.parse(saved);
    const truckIds = new Set(trucks.map((t) => t.id));
    const validConfigs = allConfigs.filter((c: { truckId: string }) => truckIds.has(c.truckId));
    const synced = validConfigs.map((c: { truckId: string; truckImmatriculation?: string; truckModele?: string }) => {
      if (c.truckImmatriculation) return c;
      const truck = getTruck(c.truckId);
      if (truck) return { ...c, truckImmatriculation: truck.immatriculation, truckModele: truck.modele };
      return c;
    });
    const needsSave = validConfigs.length !== allConfigs.length || synced.some((c: any, i: number) => !validConfigs[i]?.truckImmatriculation && c.truckImmatriculation);
    if (needsSave) localStorage.setItem('gps_configs', JSON.stringify(synced));
  }, [trucks]);

  // Libellé du camion (truck ou config pour les anciennes données)
  const getTruckLabel = (truckId: string) => {
    const truck = getTruck(truckId);
    if (truck) return truck.immatriculation;
    const config = getGPSConfigs().find((c: { truckId: string; truckImmatriculation?: string }) => c.truckId === truckId);
    return config?.truckImmatriculation || 'Camion inconnu';
  };

  // Filtrer les positions
  const filteredLocations = locations.filter(loc => {
    if (selectedTruck !== 'all' && loc.truckId !== selectedTruck) return false;
    if (filterInTrip === 'in_trip' && !loc.isInTrip) return false;
    if (filterInTrip === 'not_in_trip' && loc.isInTrip) return false;
    return true;
  });

  // Obtenir les camions avec GPS configuré
  const trucksWithGPS = getGPSConfigs().map((config: any) => ({
    config,
    truck: getTruck(config.truckId),
  })).filter((item: any) => item.truck);

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Suivi GPS en Temps Réel"
        description="Consultez la localisation de tous vos camions"
        icon={MapPin}
        gradient="from-blue-500/20 via-indigo-500/10 to-transparent"
      />
      
      {/* Indicateur du mode GPS */}
      <Alert className={gpsMode === 'simulation' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300' : 'bg-green-50 dark:bg-green-950/20 border-green-300'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {gpsMode === 'simulation' ? (
              <Play className="h-5 w-5 text-amber-600" />
            ) : (
              <Server className="h-5 w-5 text-green-600" />
            )}
            <div>
              <p className="font-medium">
                Source: {gpsMode === 'simulation' ? `${EMOJI.simulation} Simulation` : `${EMOJI.gps} Traccar (GPS réel)`}
              </p>
              <p className="text-xs text-muted-foreground">
                {gpsMode === 'simulation' 
                  ? 'Les camions en trajet se déplacent entre les villes du Cameroun'
                  : 'Positions réelles depuis le serveur Traccar'
                }
              </p>
            </div>
          </div>
          {autoRefresh && (
            <Badge variant="outline" className="animate-pulse">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Rafraîchissement auto (30s)
            </Badge>
          )}
        </div>
      </Alert>

      {/* Contrôles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5" />
            Contrôles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Filtrer par camion</label>
              <Select value={selectedTruck} onValueChange={setSelectedTruck}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les camions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les camions</SelectItem>
                  {trucksWithGPS.map(({ truck }: any) => (
                    <SelectItem key={truck.id} value={truck.id}>
                      {truck.immatriculation} - {truck.modele}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Statut</label>
              <Select value={filterInTrip} onValueChange={setFilterInTrip}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="in_trip">En trajet</SelectItem>
                  <SelectItem value="not_in_trip">Hors trajet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadLocations}
                disabled={isLoading}
                variant="outline"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualiser
                  </>
                )}
              </Button>
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
              >
                <Clock className="mr-2 h-4 w-4" />
                {autoRefresh ? 'Désactiver auto' : 'Activer auto'}
              </Button>
              {filteredLocations.length > 0 && (
                <Button
                  onClick={() => window.open(getMapUrlWithMarkers(filteredLocations), '_blank')}
                  variant="outline"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir sur carte
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Camions suivis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredLocations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">En trajet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {filteredLocations.filter(loc => loc.isInTrip).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hors trajet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {filteredLocations.filter(loc => !loc.isInTrip).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">GPS configurés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {trucksWithGPS.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des positions */}
      {filteredLocations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {locations.length === 0 
                ? 'Aucune position GPS disponible. Configurez d\'abord les GPS de vos camions.'
                : 'Aucun camion ne correspond aux filtres sélectionnés.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredLocations.map((location) => {
            const truck = getTruck(location.truckId);
            const trip = getActiveTrip(location.truckId);
            const config = getGPSConfigs().find((c: { truckId: string; truckModele?: string }) => c.truckId === location.truckId);
            
            return (
              <Card key={location.truckId} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TruckIcon className="h-5 w-5 text-primary" />
                        {getTruckLabel(location.truckId)}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {truck?.modele ?? config?.truckModele ?? ''}
                      </p>
                    </div>
                    {location.isInTrip ? (
                      <Badge className="bg-green-500">
                        <Route className="h-3 w-3 mr-1" />
                        En trajet
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <X className="h-3 w-3 mr-1" />
                        Stationné
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Source des données */}
                  <div className="flex items-center gap-1">
                    {location.source === 'traccar' ? (
                      <Badge variant="outline" className="text-xs bg-green-50 border-green-300 text-green-700">
                        <Server className="h-3 w-3 mr-1" />
                        Traccar
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs bg-amber-50 border-amber-300 text-amber-700">
                        <Play className="h-3 w-3 mr-1" />
                        Simulation
                      </Badge>
                    )}
                    {location.speed && location.speed > 5 && (
                      <Badge variant="outline" className="text-xs">
                        <Gauge className="h-3 w-3 mr-1" />
                        {location.speed} km/h
                      </Badge>
                    )}
                  </div>
                  
                  {/* Position */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">Position</span>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
                      {location.latitude.toFixed(6)}°, {location.longitude.toFixed(6)}°
                    </div>
                    {location.address && (
                      <p className="text-sm font-medium text-primary">{location.address}</p>
                    )}
                  </div>

                  {/* Informations */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {location.speed !== undefined && (
                      <div className="flex items-center gap-1">
                        <Gauge className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Vitesse:</span>
                        <span className={`font-semibold ${location.speed > 80 ? 'text-red-500' : location.speed > 0 ? 'text-green-600' : ''}`}>
                          {location.speed} km/h
                        </span>
                      </div>
                    )}
                    {location.heading !== undefined && (
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3 text-muted-foreground" style={{ transform: `rotate(${location.heading}deg)` }} />
                        <span className="text-muted-foreground">Cap:</span>
                        <span className="font-semibold">{location.heading}°</span>
                      </div>
                    )}
                    {location.signal && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Signal:</span>
                          <span className={`ml-2 font-semibold ${location.signal.strength > 70 ? 'text-green-600' : location.signal.strength > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                            {location.signal.strength}%
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Satellites:</span>
                          <span className="ml-2 font-semibold">{location.signal.satellites}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Trajet */}
                  {trip && (
                    <Alert>
                      <Route className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <div className="font-medium">{trip.origine} → {trip.destination}</div>
                        <div className="text-muted-foreground mt-1">
                          Départ: {new Date(trip.dateDepart).toLocaleDateString('fr-FR')}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Clock className="h-3 w-3" />
                    {new Date(location.timestamp).toLocaleString('fr-FR')}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(getMapUrl(location.latitude, location.longitude), '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Voir carte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
