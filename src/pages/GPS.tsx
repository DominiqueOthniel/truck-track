import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Satellite, Edit, CheckCircle2, XCircle, AlertCircle, Truck as TruckIcon, Navigation, Server, Wifi, WifiOff, Settings, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { validateIMEI } from '@/lib/gps-test';
import { 
  GPSConfig as SystemGPSConfig, 
  loadGPSConfig, 
  saveGPSConfig, 
  testTraccarConnection, 
  getTraccarDevices,
  TraccarTestResult
} from '@/lib/gps-tracking';
import { EMOJI } from '@/lib/emoji-palette';

interface TruckGPSConfig {
  truckId: string;
  imei: string;
  simNumber?: string;
  lastUpdate?: string;
  isActive?: boolean;
  /** Libellé du camion (immatriculation) - pour affichage si truckId ne matche plus */
  truckImmatriculation?: string;
  truckModele?: string;
}

export default function GPS() {
  const navigate = useNavigate();
  const { trucks } = useApp();
  
  // Configuration du système GPS (simulation/Traccar)
  const [systemConfig, setSystemConfig] = useState<SystemGPSConfig>(() => loadGPSConfig());
  const [traccarForm, setTraccarForm] = useState({
    serverUrl: systemConfig.traccar?.serverUrl || 'http://localhost:8082',
    username: systemConfig.traccar?.username || '',
    password: systemConfig.traccar?.password || '',
  });
  const [testResult, setTestResult] = useState<TraccarTestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [traccarDevices, setTraccarDevices] = useState<Array<{ id: number; name: string; uniqueId: string; status: string }>>([]);
  
  // Configuration GPS des camions
  const [gpsConfigs, setGpsConfigs] = useState<TruckGPSConfig[]>(() => {
    // Charger depuis localStorage ou initialiser avec les camions existants
    const saved = localStorage.getItem('gps_configs');
    if (saved) {
      return JSON.parse(saved);
    }
    return trucks.map(truck => ({
      truckId: truck.id,
      imei: '',
      simNumber: '',
      isActive: false,
    }));
  });
  const [editingConfig, setEditingConfig] = useState<TruckGPSConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    imei: '',
    simNumber: '',
  });
  const [validationError, setValidationError] = useState<string>('');
  
  // Supprimer les configs GPS orphelines (camions inexistants)
  useEffect(() => {
    if (trucks.length === 0) return;
    const truckIds = new Set(trucks.map((t) => t.id));
    const validConfigs = gpsConfigs.filter((c) => truckIds.has(c.truckId));
    if (validConfigs.length !== gpsConfigs.length) {
      saveConfigs(validConfigs);
    }
  }, [trucks, gpsConfigs]);

  // Charger les appareils Traccar si configuré
  useEffect(() => {
    if (systemConfig.mode === 'traccar' && systemConfig.traccar) {
      loadTraccarDevices();
    }
  }, [systemConfig]);
  
  const loadTraccarDevices = async () => {
    if (systemConfig.traccar) {
      const devices = await getTraccarDevices(systemConfig.traccar);
      setTraccarDevices(devices);
    }
  };

  // Sauvegarder les configurations
  const saveConfigs = (configs: TruckGPSConfig[]) => {
    setGpsConfigs(configs);
    localStorage.setItem('gps_configs', JSON.stringify(configs));
  };

  // Obtenir la configuration GPS d'un camion
  const getTruckGPSConfig = (truckId: string): TruckGPSConfig | undefined => {
    return gpsConfigs.find(config => config.truckId === truckId);
  };
  
  // Changer le mode GPS
  const handleModeChange = (mode: 'simulation' | 'traccar') => {
    const newConfig: SystemGPSConfig = { ...systemConfig, mode };
    setSystemConfig(newConfig);
    saveGPSConfig(newConfig);
    toast.success(`Mode GPS changé: ${mode === 'simulation' ? 'Simulation' : 'Traccar'}`);
  };
  
  // Sauvegarder la configuration Traccar
  const handleSaveTraccar = () => {
    if (!traccarForm.serverUrl || !traccarForm.username) {
      toast.error('Veuillez remplir l\'URL du serveur et le nom d\'utilisateur');
      return;
    }
    
    const newConfig: SystemGPSConfig = {
      ...systemConfig,
      mode: 'traccar',
      traccar: {
        serverUrl: traccarForm.serverUrl.replace(/\/$/, ''), // Enlever le / final
        username: traccarForm.username,
        password: traccarForm.password,
      }
    };
    
    setSystemConfig(newConfig);
    saveGPSConfig(newConfig);
    toast.success('Configuration Traccar sauvegardée');
  };
  
  // Tester la connexion Traccar
  const handleTestTraccar = async () => {
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const result = await testTraccarConnection({
        serverUrl: traccarForm.serverUrl.replace(/\/$/, ''),
        username: traccarForm.username,
        password: traccarForm.password,
      });
      
      setTestResult(result);
      
      if (result.success) {
        toast.success(result.message);
        // Charger les appareils si le test réussit
        const devices = await getTraccarDevices({
          serverUrl: traccarForm.serverUrl.replace(/\/$/, ''),
          username: traccarForm.username,
          password: traccarForm.password,
        });
        setTraccarDevices(devices);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error('Erreur lors du test de connexion');
    } finally {
      setIsTesting(false);
    }
  };

  // Ouvrir le dialogue d'édition
  const handleEdit = (truckId: string) => {
    const config = getTruckGPSConfig(truckId) || {
      truckId,
      imei: '',
      simNumber: '',
      isActive: false,
    };
    setEditingConfig(config);
    setFormData({
      imei: config.imei || '',
      simNumber: config.simNumber || '',
    });
    setValidationError('');
    setIsDialogOpen(true);
  };

  // Sauvegarder la configuration
  const handleSave = () => {
    if (!editingConfig) return;

    // Validation de l'IMEI si fourni
    if (formData.imei) {
      const validation = validateIMEI(formData.imei);
      if (!validation.valid) {
        setValidationError(validation.error || 'IMEI invalide');
        toast.error(validation.error || 'IMEI invalide');
        return;
      }
    }

    const updatedConfigs = [...gpsConfigs];
    const existingIndex = updatedConfigs.findIndex(c => c.truckId === editingConfig.truckId);
    
    const truck = getTruck(editingConfig.truckId);
    const updatedConfig: TruckGPSConfig = {
      ...editingConfig,
      imei: formData.imei,
      simNumber: formData.simNumber || undefined,
      lastUpdate: new Date().toISOString(),
      isActive: !!formData.imei,
      truckImmatriculation: truck?.immatriculation,
      truckModele: truck?.modele,
    };

    if (existingIndex >= 0) {
      updatedConfigs[existingIndex] = updatedConfig;
    } else {
      updatedConfigs.push(updatedConfig);
    }

    saveConfigs(updatedConfigs);
    setIsDialogOpen(false);
    setEditingConfig(null);
    setFormData({ imei: '', simNumber: '' });
    toast.success('Configuration GPS sauvegardée avec succès');
  };

  // Gérer le changement d'IMEI
  const handleImeiChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 15);
    setFormData({ ...formData, imei: digitsOnly });
    
    if (digitsOnly.length === 15) {
      const validation = validateIMEI(digitsOnly);
      setValidationError(validation.error || '');
    } else if (digitsOnly.length > 0) {
      setValidationError('');
    } else {
      setValidationError('');
    }
  };

  // Obtenir le camion par ID
  const getTruck = (truckId: string) => {
    return trucks.find(t => t.id === truckId);
  };

  // Camions avec configuration GPS
  const trucksWithGPS = trucks.map(truck => ({
    truck,
    config: getTruckGPSConfig(truck.id),
  }));

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Configuration GPS"
          description="Gérez les paramètres GPS de vos camions"
          icon={Satellite}
          gradient="from-teal-500/20 via-cyan-500/10 to-transparent"
        />
        <Button
          onClick={() => navigate('/suivi')}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Navigation className="mr-2 h-4 w-4" />
          Suivi en temps réel
        </Button>
      </div>
      
      {/* Mode actuel */}
      <Alert className={systemConfig.mode === 'simulation' ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300' : 'bg-green-50 dark:bg-green-950/20 border-green-300'}>
        <div className="flex items-center gap-2">
          {systemConfig.mode === 'simulation' ? (
            <Play className="h-5 w-5 text-amber-600" />
          ) : (
            <Server className="h-5 w-5 text-green-600" />
          )}
          <div>
            <p className="font-medium">
              Mode actuel: {systemConfig.mode === 'simulation' ? `${EMOJI.simulation} Simulation` : `${EMOJI.gps} Traccar (API réelle)`}
            </p>
            <p className="text-sm text-muted-foreground">
              {systemConfig.mode === 'simulation' 
                ? 'Les positions sont simulées avec des mouvements réalistes au Cameroun'
                : `Connecté à ${systemConfig.traccar?.serverUrl}`
              }
            </p>
          </div>
        </div>
      </Alert>

      {/* Statistiques */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Camions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trucks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">GPS Configurés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {gpsConfigs.filter(c => c.imei && c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sans GPS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {trucks.length - gpsConfigs.filter(c => c.imei && c.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {systemConfig.mode === 'traccar' ? 'Appareils Traccar' : 'Mode'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {systemConfig.mode === 'traccar' ? traccarDevices.length : 'Simulation'}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Configuration du système GPS */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuration du Système GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={systemConfig.mode} onValueChange={(v) => handleModeChange(v as 'simulation' | 'traccar')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="simulation" className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Simulation
              </TabsTrigger>
              <TabsTrigger value="traccar" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Traccar (API)
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="simulation" className="mt-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4 border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Play className="h-4 w-4 text-amber-600" />
                  Mode Simulation
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Ce mode génère des positions GPS simulées avec des mouvements réalistes entre les principales villes du Cameroun.
                  Idéal pour les tests et les démonstrations.
                </p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>✓ Les camions en trajet se déplacent entre les villes (50-90 km/h)</li>
                  <li>✓ Les camions à l'arrêt ont des positions stables</li>
                  <li>✓ Adresses basées sur les villes camerounaises</li>
                  <li>✓ Données de signal GPS simulées</li>
                </ul>
              </div>
            </TabsContent>
            
            <TabsContent value="traccar" className="mt-4 space-y-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Server className="h-4 w-4 text-blue-600" />
                  Mode Traccar (API réelle)
                </h4>
                <p className="text-sm text-muted-foreground">
                  Connectez-vous à un serveur Traccar pour obtenir les positions GPS réelles de vos appareils.
                  Vous pouvez utiliser le serveur de démo ou votre propre installation.
                </p>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="serverUrl">URL du serveur Traccar</Label>
                    <Input
                      id="serverUrl"
                      value={traccarForm.serverUrl}
                      onChange={(e) => setTraccarForm({ ...traccarForm, serverUrl: e.target.value })}
                      placeholder="http://localhost:8082"
                      className="mt-1 font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Serveur de démo: https://demo.traccar.org
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="username">Nom d'utilisateur</Label>
                    <Input
                      id="username"
                      value={traccarForm.username}
                      onChange={(e) => setTraccarForm({ ...traccarForm, username: e.target.value })}
                      placeholder="admin"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      value={traccarForm.password}
                      onChange={(e) => setTraccarForm({ ...traccarForm, password: e.target.value })}
                      placeholder="••••••••"
                      className="mt-1"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={handleTestTraccar}
                      variant="outline"
                      disabled={isTesting}
                      className="flex-1"
                    >
                      {isTesting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Wifi className="h-4 w-4 mr-2" />
                      )}
                      Tester la connexion
                    </Button>
                    <Button onClick={handleSaveTraccar} className="flex-1">
                      Sauvegarder
                    </Button>
                  </div>
                  
                  {testResult && (
                    <Alert className={testResult.success ? 'bg-green-50 dark:bg-green-950/20 border-green-300' : 'bg-red-50 dark:bg-red-950/20 border-red-300'}>
                      {testResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <WifiOff className="h-4 w-4 text-red-600" />
                      )}
                      <AlertDescription>
                        <p className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                          {testResult.message}
                        </p>
                        {testResult.success && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Version: {testResult.serverVersion} | Appareils: {testResult.devicesCount}
                          </p>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {/* Liste des appareils Traccar */}
                {traccarDevices.length > 0 && (
                  <div>
                    <Label className="mb-2 block">Appareils Traccar détectés</Label>
                    <div className="border rounded-md max-h-60 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom</TableHead>
                            <TableHead>IMEI</TableHead>
                            <TableHead>Statut</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {traccarDevices.map(device => (
                            <TableRow key={device.id}>
                              <TableCell className="font-medium">{device.name}</TableCell>
                              <TableCell className="font-mono text-xs">{device.uniqueId}</TableCell>
                              <TableCell>
                                <Badge variant={device.status === 'online' ? 'default' : 'secondary'}>
                                  {device.status === 'online' ? 'En ligne' : 'Hors ligne'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Utilisez les IMEI ci-dessus pour configurer vos camions
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Liste des camions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5" />
            Camions et Configuration GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camion</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Numéro SIM</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Dernière mise à jour</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucksWithGPS.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun camion enregistré
                    </TableCell>
                  </TableRow>
                ) : (
                  trucksWithGPS.map(({ truck, config }) => (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">{truck.immatriculation}</TableCell>
                      <TableCell>{truck.modele}</TableCell>
                      <TableCell>
                        {config?.imei ? (
                          <span className="font-mono text-sm">{config.imei}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Non configuré</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {config?.simNumber ? (
                          <span className="text-sm">{config.simNumber}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {config?.isActive ? (
                          <Badge className="bg-green-500">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Actif
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {config?.lastUpdate ? (
                          <span className="text-sm text-muted-foreground">
                            {new Date(config.lastUpdate).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(truck.id)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Configurer
                          </Button>
                          {config?.imei && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/gps-test', { state: { imei: config.imei, simNumber: config.simNumber } })}
                              >
                                <Satellite className="h-4 w-4 mr-1" />
                                Tester
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate('/suivi', { state: { truckId: truck.id } })}
                                className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                              >
                                <Navigation className="h-4 w-4 mr-1" />
                                Suivre
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
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-teal-50 dark:bg-teal-950/20 border-teal-200 dark:border-teal-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-teal-600" />
            Comment configurer le GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-teal-900 dark:text-teal-100">
            <li>Sélectionnez un camion et cliquez sur "Configurer"</li>
            <li>Entrez l'IMEI de l'appareil GPS (15 chiffres)</li>
            <li>Optionnellement, entrez le numéro SIM pour les commandes SMS</li>
            <li>Cliquez sur "Sauvegarder" pour enregistrer la configuration</li>
            <li>Utilisez "Tester" pour vérifier la connexion GPS</li>
          </ol>
        </CardContent>
      </Card>

      {/* Dialogue d'édition */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? 'Modifier la configuration GPS' : 'Nouvelle configuration GPS'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingConfig && (
              <div>
                <Label>Camion</Label>
                <div className="mt-1 p-2 bg-muted rounded-md">
                  {getTruck(editingConfig.truckId)?.immatriculation} - {getTruck(editingConfig.truckId)?.modele}
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="imei">IMEI (15 chiffres) *</Label>
              <Input
                id="imei"
                value={formData.imei}
                onChange={(e) => handleImeiChange(e.target.value)}
                placeholder="Ex: 123456789012345"
                maxLength={15}
                className="font-mono text-lg mt-1"
              />
              {validationError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{validationError}</AlertDescription>
                </Alert>
              )}
              {formData.imei.length === 15 && !validationError && (
                <Alert className="mt-2 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-xs text-green-700 dark:text-green-300">
                    IMEI valide
                  </AlertDescription>
                </Alert>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Numéro IMEI unique de l'appareil GPS (15 chiffres)
              </p>
            </div>
            <div>
              <Label htmlFor="simNumber">Numéro SIM (optionnel)</Label>
              <Input
                id="simNumber"
                value={formData.simNumber}
                onChange={(e) => setFormData({ ...formData, simNumber: e.target.value })}
                placeholder="Ex: +237612345678"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pour envoyer des commandes SMS de test
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={!!validationError && formData.imei.length === 15}>
                Sauvegarder
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
