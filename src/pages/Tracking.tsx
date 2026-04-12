import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MapPin, RefreshCw, ExternalLink, Navigation } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/contexts/AppContext';
import type { Trip } from '@/contexts/AppContext';
import { readGpsBindings } from '@/lib/gps-config-local';
import {
  getAllTruckLocations,
  getMapUrl,
  loadGPSConfig,
  type TruckLocation,
  type TripInfo,
} from '@/lib/gps-tracking';
import { toast } from 'sonner';

function tripInfoForTruck(truckId: string, trips: Trip[]): TripInfo | undefined {
  const tr = trips.find(
    (t) =>
      t.statut === 'en_cours' &&
      (t.tracteurId === truckId || t.remorqueuseId === truckId),
  );
  if (!tr) return undefined;
  return {
    id: tr.id,
    origine: tr.origine,
    destination: tr.destination,
    origineLat: tr.origineLat,
    origineLng: tr.origineLng,
    destinationLat: tr.destinationLat,
    destinationLng: tr.destinationLng,
    dateDepart: tr.dateDepart,
  };
}

export default function Tracking() {
  const { trucks, trips } = useApp();
  const location = useLocation();
  const focusTruckId = (location.state as { truckId?: string } | null)?.truckId;

  const [locs, setLocs] = useState<TruckLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const truckById = useMemo(() => new Map(trucks.map((t) => [t.id, t])), [trucks]);

  const refresh = useCallback(async () => {
    loadGPSConfig();
    let bindings = readGpsBindings().filter((b) => b.isActive && /^\d{15}$/.test(b.imei));
    if (focusTruckId) {
      bindings = bindings.filter((b) => b.truckId === focusTruckId);
    }
    if (bindings.length === 0) {
      setLocs([]);
      setUpdatedAt(new Date());
      return;
    }
    setLoading(true);
    try {
      const payload = bindings.map((b) => ({
        truckId: b.truckId,
        imei: b.imei,
        tripInfo: tripInfoForTruck(b.truckId, trips),
      }));
      const next = await getAllTruckLocations(payload);
      setLocs(next);
      setUpdatedAt(new Date());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur suivi GPS');
    } finally {
      setLoading(false);
    }
  }, [trips, focusTruckId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh(), 30000);
    return () => clearInterval(id);
  }, [refresh]);

  const activeCount = readGpsBindings().filter((b) => b.isActive && /^\d{15}$/.test(b.imei)).length;

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Suivi GPS"
        description={
          focusTruckId
            ? `Focalisé sur un camion — ${truckById.get(focusTruckId)?.immatriculation ?? focusTruckId}`
            : 'Positions des camions avec IMEI actif (simulation ou Traccar selon la page GPS).'
        }
        icon={MapPin}
        gradient="from-indigo-500/20 via-blue-500/10 to-transparent"
        actions={
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        }
      />

      {activeCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Aucun tracker actif. Configurez les IMEI sur la page <strong className="text-foreground">GPS & Trackers</strong>.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {locs.map((loc) => {
          const truck = truckById.get(loc.truckId);
          const mapUrl = getMapUrl(loc.latitude, loc.longitude);
          return (
            <Card key={loc.truckId} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {truck?.immatriculation ?? loc.truckId}
                  </CardTitle>
                  <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                    {loc.source ?? '—'}
                  </Badge>
                </div>
                {truck?.modele && <p className="text-xs text-muted-foreground">{truck.modele}</p>}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground leading-snug">{loc.address ?? 'Adresse indisponible'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground">
                  <span>
                    {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                  </span>
                  {loc.speed != null && <span>{loc.speed} km/h</span>}
                  {loc.isInTrip && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Navigation className="h-3 w-3" />
                      En trajet
                    </span>
                  )}
                </div>
                <Button variant="secondary" size="sm" className="gap-2" asChild>
                  <a href={mapUrl} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir dans Google Maps
                  </a>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {updatedAt && activeCount > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Dernière mise à jour : {updatedAt.toLocaleTimeString('fr-FR')} — rafraîchissement automatique toutes les 30 s.
        </p>
      )}
    </div>
  );
}
