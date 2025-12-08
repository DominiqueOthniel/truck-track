import { useState } from 'react';
import { useApp, Truck } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Navigation, Satellite, Settings, CheckCircle2, XCircle, RefreshCw, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { Textarea } from '@/components/ui/textarea';

export default function GPSConfig() {
  const { trucks, setTrucks } = useApp();
  const [selectedTruck, setSelectedTruck] = useState<Truck | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [gpsConfig, setGpsConfig] = useState({
    imei: '',
    simNumber: '',
    deviceModel: '',
    isActive: false,
    trackingInterval: 60,
    webhookUrl: '',
    apiKey: '',
  });

  const resetConfig = () => {
    setGpsConfig({
      imei: '',
      simNumber: '',
      deviceModel: '',
      isActive: false,
      trackingInterval: 60,
      webhookUrl: '',
      apiKey: '',
    });
    setSelectedTruck(null);
  };

  const handleEditGPS = (truck: Truck) => {
    setSelectedTruck(truck);
    setGpsConfig({
      imei: truck.gps?.imei || '',
      simNumber: truck.gps?.simNumber || '',
      deviceModel: truck.gps?.deviceModel || '',
      isActive: truck.gps?.isActive ?? false,
      trackingInterval: truck.gps?.trackingInterval || 60,
      webhookUrl: truck.gps?.webhookUrl || '',
      apiKey: truck.gps?.apiKey || '',
    });
    setIsConfigDialogOpen(true);
  };

  const handleSaveGPS = () => {
    if (!selectedTruck) return;

    if (gpsConfig.imei && !/^\d{15}$/.test(gpsConfig.imei)) {
      toast.error('L\'IMEI doit contenir exactement 15 chiffres');
      return;
    }

    if (gpsConfig.simNumber && !/^\+237[0-9]{9}$/.test(gpsConfig.simNumber) && !/^[0-9]{9}$/.test(gpsConfig.simNumber)) {
      toast.error('Le numéro SIM doit être au format camerounais (+237XXXXXXXXX ou XXXXXXXXX)');
      return;
    }

    const updatedTruck: Truck = {
      ...selectedTruck,
      gps: {
        imei: gpsConfig.imei || undefined,
        simNumber: gpsConfig.simNumber || undefined,
        deviceModel: gpsConfig.deviceModel || undefined,
        isActive: gpsConfig.isActive,
        trackingInterval: gpsConfig.trackingInterval,
        webhookUrl: gpsConfig.webhookUrl || undefined,
        apiKey: gpsConfig.apiKey || undefined,
        lastUpdate: selectedTruck.gps?.lastUpdate,
      },
    };

    setTrucks(trucks.map(t => t.id === selectedTruck.id ? updatedTruck : t));
    toast.success('Configuration GPS enregistrée avec succès');
    setIsConfigDialogOpen(false);
    resetConfig();
  };

  const handleRemoveGPS = (truckId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer la configuration GPS de ce camion ?')) {
      setTrucks(trucks.map(t => 
        t.id === truckId 
          ? { ...t, gps: undefined }
          : t
      ));
      toast.success('Configuration GPS supprimée');
    }
  };

  const handleTestConnection = (truck: Truck) => {
    if (!truck.gps?.imei) {
      toast.error('Aucun IMEI configuré pour ce camion');
      return;
    }
    toast.info(`Test de connexion GPS pour ${truck.immatriculation}...`);
    // Simulation d'un test de connexion
    setTimeout(() => {
      toast.success('Connexion GPS réussie !');
    }, 2000);
  };

  const copyWebhookUrl = (truck: Truck) => {
    if (!truck.gps?.webhookUrl) {
      toast.error('Aucune URL webhook configurée');
      return;
    }
    navigator.clipboard.writeText(truck.gps.webhookUrl);
    toast.success('URL webhook copiée dans le presse-papiers');
  };

  const filteredTrucks = trucks.filter(truck => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        truck.immatriculation.toLowerCase().includes(search) ||
        truck.modele.toLowerCase().includes(search) ||
        truck.gps?.imei?.includes(search) ||
        truck.gps?.simNumber?.includes(search)
      );
    }
    return true;
  });

  const trucksWithGPS = trucks.filter(t => t.gps && t.gps.imei);
  const activeGPS = trucksWithGPS.filter(t => t.gps?.isActive).length;

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Configuration GPS"
        description="Configurez et gérez les appareils GPS de vos camions"
        icon={Satellite}
        gradient="from-blue-500/20 via-cyan-500/10 to-transparent"
        stats={[
          {
            label: 'Total Camions',
            value: trucks.length,
            icon: <Navigation className="h-4 w-4" />,
            color: 'text-blue-600 dark:text-blue-400'
          },
          {
            label: 'GPS Configurés',
            value: trucksWithGPS.length,
            icon: <Satellite className="h-4 w-4" />,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            label: 'GPS Actifs',
            value: activeGPS,
            icon: <CheckCircle2 className="h-4 w-4" />,
            color: 'text-emerald-600 dark:text-emerald-400'
          },
          {
            label: 'Sans GPS',
            value: trucks.length - trucksWithGPS.length,
            icon: <XCircle className="h-4 w-4" />,
            color: 'text-orange-600 dark:text-orange-400'
          }
        ]}
      />

      {/* Recherche */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par immatriculation, modèle, IMEI ou numéro SIM..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Liste des camions avec configuration GPS */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Satellite className="h-5 w-5" />
            Configuration GPS des Camions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Camion</TableHead>
                <TableHead>IMEI</TableHead>
                <TableHead>Numéro SIM</TableHead>
                <TableHead>Modèle GPS</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Intervalle</TableHead>
                <TableHead>Dernière MAJ</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrucks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Aucun camion trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrucks.map((truck) => (
                  <TableRow key={truck.id}>
                    <TableCell>
                      <div>
                        <div className="font-semibold">{truck.immatriculation}</div>
                        <div className="text-xs text-muted-foreground">{truck.modele}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {truck.gps?.imei ? (
                        <Badge variant="outline" className="font-mono text-xs">
                          {truck.gps.imei}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Non configuré</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {truck.gps?.simNumber ? (
                        <span className="text-sm">{truck.gps.simNumber}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {truck.gps?.deviceModel ? (
                        <span className="text-sm">{truck.gps.deviceModel}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {truck.gps?.isActive ? (
                        <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Actif
                        </Badge>
                      ) : truck.gps?.imei ? (
                        <Badge variant="outline" className="text-orange-600">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Non configuré
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {truck.gps?.trackingInterval ? (
                        <span className="text-sm">{truck.gps.trackingInterval}s</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {truck.gps?.lastUpdate ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(truck.gps.lastUpdate).toLocaleString('fr-FR')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Jamais</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditGPS(truck)}
                          title="Configurer GPS"
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        {truck.gps?.imei && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTestConnection(truck)}
                              title="Tester la connexion"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemoveGPS(truck.id)}
                              title="Supprimer la configuration"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog de configuration GPS */}
      <Dialog open={isConfigDialogOpen} onOpenChange={(open) => {
        setIsConfigDialogOpen(open);
        if (!open) resetConfig();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Configuration GPS - {selectedTruck?.immatriculation}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Informations de base */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Informations de l'appareil GPS</h3>
              
              <div>
                <Label htmlFor="imei">IMEI (15 chiffres) *</Label>
                <Input
                  id="imei"
                  value={gpsConfig.imei}
                  onChange={(e) => setGpsConfig({ ...gpsConfig, imei: e.target.value.replace(/\D/g, '').slice(0, 15) })}
                  placeholder="Ex: 123456789012345"
                  maxLength={15}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Numéro IMEI unique de l'appareil GPS (15 chiffres)
                </p>
              </div>

              <div>
                <Label htmlFor="simNumber">Numéro SIM</Label>
                <Input
                  id="simNumber"
                  value={gpsConfig.simNumber}
                  onChange={(e) => setGpsConfig({ ...gpsConfig, simNumber: e.target.value })}
                  placeholder="Ex: +237612345678 ou 612345678"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Numéro de téléphone de la carte SIM dans le GPS
                </p>
              </div>

              <div>
                <Label htmlFor="deviceModel">Modèle de l'appareil GPS</Label>
                <Select
                  value={gpsConfig.deviceModel}
                  onValueChange={(value) => setGpsConfig({ ...gpsConfig, deviceModel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TK103">TK103 / TK103B</SelectItem>
                    <SelectItem value="GT06">GT06 / GT06N</SelectItem>
                    <SelectItem value="GT02">GT02</SelectItem>
                    <SelectItem value="VT600">VT600</SelectItem>
                    <SelectItem value="OBD">OBD Tracker</SelectItem>
                    <SelectItem value="Autre">Autre modèle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Paramètres de tracking */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Paramètres de tracking</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Activer le tracking GPS</Label>
                  <p className="text-xs text-muted-foreground">
                    Activez pour recevoir les positions de ce camion
                  </p>
                </div>
                <Switch
                  id="isActive"
                  checked={gpsConfig.isActive}
                  onCheckedChange={(checked) => setGpsConfig({ ...gpsConfig, isActive: checked })}
                />
              </div>

              <div>
                <Label htmlFor="trackingInterval">Intervalle de tracking (secondes)</Label>
                <Select
                  value={gpsConfig.trackingInterval.toString()}
                  onValueChange={(value) => setGpsConfig({ ...gpsConfig, trackingInterval: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 secondes (haute fréquence)</SelectItem>
                    <SelectItem value="60">1 minute (recommandé)</SelectItem>
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                    <SelectItem value="1800">30 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Fréquence d'envoi des positions GPS
                </p>
              </div>
            </div>

            {/* Configuration Webhook */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Configuration Webhook (optionnel)</h3>
              
              <div>
                <Label htmlFor="webhookUrl">URL Webhook</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhookUrl"
                    value={gpsConfig.webhookUrl}
                    onChange={(e) => setGpsConfig({ ...gpsConfig, webhookUrl: e.target.value })}
                    placeholder="https://votre-serveur.com/api/gps/webhook"
                    type="url"
                  />
                  {gpsConfig.webhookUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(gpsConfig.webhookUrl);
                        toast.success('URL copiée');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  URL où les données GPS seront envoyées en temps réel
                </p>
              </div>

              <div>
                <Label htmlFor="apiKey">Clé API (optionnel)</Label>
                <Input
                  id="apiKey"
                  value={gpsConfig.apiKey}
                  onChange={(e) => setGpsConfig({ ...gpsConfig, apiKey: e.target.value })}
                  placeholder="Clé d'authentification pour le webhook"
                  type="password"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Clé secrète pour sécuriser les requêtes webhook
                </p>
              </div>
            </div>

            {/* Instructions */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Instructions de configuration :</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                      <li>Installez l'appareil GPS dans le camion</li>
                      <li>Insérez une carte SIM avec crédit dans l'appareil</li>
                      <li>Notez l'IMEI (généralement affiché au démarrage ou sur l'étiquette)</li>
                      <li>Configurez l'appareil pour envoyer les données à votre serveur</li>
                      <li>Testez la connexion pour vérifier que tout fonctionne</li>
                    </ol>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setIsConfigDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSaveGPS} disabled={!gpsConfig.imei || gpsConfig.imei.length !== 15}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Enregistrer la configuration
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

