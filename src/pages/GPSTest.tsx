import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Satellite, MapPin, Signal, RefreshCw, CheckCircle2, XCircle, ExternalLink, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '@/components/PageHeader';
import { testGPSConnection, sendTestCommand, validateIMEI, getMapUrl, GPSTestResult } from '@/lib/gps-test';

export default function GPSTest() {
  const [imei, setImei] = useState('');
  const [simNumber, setSimNumber] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<GPSTestResult | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const handleTest = async () => {
    // Validation de l'IMEI
    const validation = validateIMEI(imei);
    if (!validation.valid) {
      setValidationError(validation.error || 'IMEI invalide');
      toast.error(validation.error || 'IMEI invalide');
      return;
    }

    setValidationError('');
    setIsTesting(true);
    setTestResult(null);

    try {
      // Test de connexion GPS
      const result = await testGPSConnection(imei);
      setTestResult(result);

      if (result.success) {
        toast.success('Connexion GPS réussie ! Position récupérée.');
      } else {
        toast.error(result.error || 'Échec de la connexion GPS');
      }
    } catch (error) {
      toast.error('Erreur lors du test GPS');
      setTestResult({
        success: false,
        imei,
        timestamp: new Date().toISOString(),
        error: 'Erreur inattendue lors du test',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendCommand = async () => {
    const validation = validateIMEI(imei);
    if (!validation.valid) {
      toast.error(validation.error || 'IMEI invalide');
      return;
    }

    setIsTesting(true);
    try {
      const result = await sendTestCommand(imei, simNumber || undefined);
      if (result.success) {
        toast.success(result.message);
        // Attendre un peu puis tester la connexion
        setTimeout(() => {
          handleTest();
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de la commande');
    } finally {
      setIsTesting(false);
    }
  };

  const handleImeiChange = (value: string) => {
    // Ne garder que les chiffres
    const digitsOnly = value.replace(/\D/g, '').slice(0, 15);
    setImei(digitsOnly);
    
    if (digitsOnly.length === 15) {
      const validation = validateIMEI(digitsOnly);
      setValidationError(validation.error || '');
    } else {
      setValidationError('');
    }
  };

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Test GPS"
        description="Testez la connexion GPS avec un IMEI"
        icon={Satellite}
        gradient="from-blue-500/20 via-cyan-500/10 to-transparent"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulaire de test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Satellite className="h-5 w-5" />
              Tester un appareil GPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="imei">IMEI (15 chiffres) *</Label>
              <Input
                id="imei"
                value={imei}
                onChange={(e) => handleImeiChange(e.target.value)}
                placeholder="Ex: 123456789012345"
                maxLength={15}
                className="font-mono text-lg"
              />
              {validationError && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{validationError}</AlertDescription>
                </Alert>
              )}
              {imei.length === 15 && !validationError && (
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
                value={simNumber}
                onChange={(e) => setSimNumber(e.target.value)}
                placeholder="Ex: +237612345678"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pour envoyer une commande SMS de test
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTest}
                disabled={isTesting || imei.length !== 15 || !!validationError}
                className="flex-1"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Tester la connexion
                  </>
                )}
              </Button>
              {simNumber && (
                <Button
                  onClick={handleSendCommand}
                  disabled={isTesting || imei.length !== 15 || !!validationError}
                  variant="outline"
                >
                  <Satellite className="mr-2 h-4 w-4" />
                  Envoyer commande
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Résultats du test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {testResult?.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : testResult ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              )}
              Résultat du test
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!testResult ? (
              <div className="text-center py-8 text-muted-foreground">
                <Satellite className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun test effectué</p>
                <p className="text-xs mt-2">Entrez un IMEI et cliquez sur "Tester la connexion"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Statut */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Statut</span>
                  <Badge
                    variant={testResult.success ? 'default' : 'destructive'}
                    className={testResult.success ? 'bg-green-500' : ''}
                  >
                    {testResult.success ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connexion réussie
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Échec
                      </>
                    )}
                  </Badge>
                </div>

                {/* Informations */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IMEI:</span>
                    <span className="font-mono font-semibold">{testResult.imei}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date du test:</span>
                    <span>{new Date(testResult.timestamp).toLocaleString('fr-FR')}</span>
                  </div>
                </div>

                {/* Position GPS */}
                {testResult.success && testResult.position && (
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-semibold">Position GPS</span>
                    </div>
                    <div className="bg-primary/5 p-3 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Latitude:</span>
                        <span className="font-mono font-semibold">{testResult.position.latitude.toFixed(6)}°</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Longitude:</span>
                        <span className="font-mono font-semibold">{testResult.position.longitude.toFixed(6)}°</span>
                      </div>
                      {testResult.position.address && (
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          {testResult.position.address}
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => window.open(getMapUrl(testResult.position!.latitude, testResult.position!.longitude), '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Voir sur Google Maps
                      </Button>
                    </div>
                  </div>
                )}

                {/* Signal */}
                {testResult.success && testResult.signal && (
                  <div className="space-y-2 pt-3 border-t">
                    <div className="flex items-center gap-2">
                      <Signal className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm">Signal GPS</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Force du signal:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                testResult.signal.strength >= 80
                                  ? 'bg-green-500'
                                  : testResult.signal.strength >= 50
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${testResult.signal.strength}%` }}
                            />
                          </div>
                          <span className="font-semibold">{testResult.signal.strength}%</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Satellites:</span>
                        <span className="font-semibold">{testResult.signal.satellites}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Erreur */}
                {!testResult.success && testResult.error && (
                  <Alert variant="destructive" className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{testResult.error}</AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Comment tester votre GPS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-900 dark:text-blue-100">
            <li>Entrez l'IMEI de votre appareil GPS (15 chiffres)</li>
            <li>Cliquez sur "Tester la connexion" pour vérifier si l'appareil répond</li>
            <li>Si vous avez le numéro SIM, vous pouvez envoyer une commande de test</li>
            <li>Le test simule une connexion et récupère une position GPS</li>
            <li>Si le test réussit, vous verrez la position sur une carte</li>
          </ol>
          <Alert className="mt-4 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Note:</strong> Ce test est une simulation. Pour un vrai test, vous devez configurer votre serveur GPS 
              pour recevoir les données de l'appareil. L'IMEI doit être correctement configuré dans votre système GPS.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
