import { useState } from 'react';
import { Satellite, Loader2, CheckCircle2, XCircle, Radio } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import { loadGPSConfig, testTraccarConnection } from '@/lib/gps-tracking';
import { testGPSConnection, validateIMEI } from '@/lib/gps-test';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function GPSTest() {
  const [imei, setImei] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const runTest = async () => {
    const trimmed = imei.replace(/\D/g, '').slice(0, 15);
    setImei(trimmed);
    const v = validateIMEI(trimmed);
    if (!v.valid) {
      toast.error(v.error ?? 'IMEI invalide');
      setResult(null);
      setOk(null);
      return;
    }

    setLoading(true);
    setResult(null);
    setOk(null);

    try {
      const cfg = loadGPSConfig();
      if (cfg.mode === 'traccar' && cfg.traccar?.serverUrl) {
        const tr = await testTraccarConnection(cfg.traccar);
        setOk(tr.success);
        setResult(
          tr.success
            ? `${tr.message} — version ${tr.serverVersion ?? '?'}, ${tr.devicesCount ?? 0} appareil(s). Ensuite, vérifiez que l’IMEI ${trimmed} est bien enregistré sur le serveur.`
            : tr.message,
        );
        if (!tr.success) toast.error(tr.message);
        else toast.success('Connexion Traccar OK');
      } else {
        const r = await testGPSConnection(trimmed);
        setOk(r.success);
        if (r.success && r.position) {
          setResult(
            `Position simulée : ${r.position.latitude.toFixed(5)}, ${r.position.longitude.toFixed(5)} — ${r.position.address ?? ''}`,
          );
          toast.success('Test simulation OK');
        } else {
          setResult(r.error ?? 'Échec');
          toast.error(r.error ?? 'Échec du test');
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      setOk(false);
      setResult(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="Test GPS"
        description="Valide un IMEI (15 chiffres). En mode Traccar, teste d’abord la connexion au serveur configuré sur la page GPS."
        icon={Satellite}
        gradient="from-cyan-500/20 via-teal-500/10 to-transparent"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Radio className="h-4 w-4" />
            Diagnostic
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="imei-test">IMEI</Label>
            <Input
              id="imei-test"
              className="font-mono"
              placeholder="15 chiffres"
              value={imei}
              onChange={(e) => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))}
              maxLength={15}
            />
          </div>
          <Button type="button" onClick={() => void runTest()} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Satellite className="h-4 w-4" />}
            Lancer le test
          </Button>

          {ok !== null && (
            <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
              {ok ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div>
                <Badge variant={ok ? 'default' : 'destructive'} className="mb-1">
                  {ok ? 'Succès' : 'Échec'}
                </Badge>
                {result && <p className="text-muted-foreground leading-snug">{result}</p>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
