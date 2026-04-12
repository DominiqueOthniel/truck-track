import { useMemo, useState } from 'react';
import { Satellite, Save, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PageHeader from '@/components/PageHeader';
import { useApp } from '@/contexts/AppContext';
import { loadGPSConfig, saveGPSConfig, type GPSConfig } from '@/lib/gps-tracking';
import {
  readGpsBindings,
  upsertTruckGpsBinding,
  type TruckGpsBinding,
} from '@/lib/gps-config-local';
import { validateIMEI } from '@/lib/gps-test';
import { toast } from 'sonner';

export default function GPS() {
  const { trucks } = useApp();
  const [bindings, setBindings] = useState<TruckGpsBinding[]>(() => readGpsBindings());

  const initial = useMemo(() => loadGPSConfig(), []);
  const [mode, setMode] = useState<GPSConfig['mode']>(initial.mode);
  const [traccarUrl, setTraccarUrl] = useState(initial.traccar?.serverUrl ?? '');
  const [traccarUser, setTraccarUser] = useState(initial.traccar?.username ?? '');
  const [traccarPass, setTraccarPass] = useState(initial.traccar?.password ?? '');

  const bindingByTruck = useMemo(() => {
    const m = new Map<string, TruckGpsBinding>();
    bindings.forEach((b) => m.set(b.truckId, b));
    return m;
  }, [bindings]);

  const persistSystemConfig = () => {
    const cfg: GPSConfig = {
      mode,
      traccar:
        mode === 'traccar'
          ? { serverUrl: traccarUrl.trim(), username: traccarUser.trim(), password: traccarPass }
          : undefined,
    };
    saveGPSConfig(cfg);
    toast.success('Configuration GPS enregistrée');
  };

  const updateLocalBinding = (truckId: string, patch: Partial<TruckGpsBinding>) => {
    const prev = bindingByTruck.get(truckId) ?? { truckId, imei: '', isActive: false };
    const next = { ...prev, ...patch, truckId };
    upsertTruckGpsBinding(next);
    setBindings(readGpsBindings());
  };

  const saveRow = (truckId: string) => {
    const b = bindingByTruck.get(truckId);
    if (!b?.imei.trim()) {
      upsertTruckGpsBinding({ truckId, imei: '', isActive: false });
      setBindings(readGpsBindings());
      toast.success('Liaison effacée');
      return;
    }
    const v = validateIMEI(b.imei.trim());
    if (!v.valid) {
      toast.error(v.error ?? 'IMEI invalide');
      return;
    }
    upsertTruckGpsBinding({ truckId, imei: b.imei.trim(), isActive: b.isActive });
    setBindings(readGpsBindings());
    toast.success('IMEI enregistré pour ce camion');
  };

  return (
    <div className="space-y-6 p-1">
      <PageHeader
        title="GPS & Trackers"
        description="Mode simulation ou Traccar, puis IMEI par camion (15 chiffres). Utilisez « Suivi GPS » pour les positions."
        icon={Satellite}
        gradient="from-blue-500/20 via-cyan-500/10 to-transparent"
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          En mode <strong>simulation</strong>, les positions sont générées localement (démo). En mode{' '}
          <strong>Traccar</strong>, renseignez l’URL du serveur (ex. https://demo.traccar.org) et vos identifiants.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuration générale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Source des positions</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as GPSConfig['mode'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulation">Simulation (démo)</SelectItem>
                  <SelectItem value="traccar">Serveur Traccar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'traccar' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="tc-url">URL du serveur Traccar</Label>
                <Input
                  id="tc-url"
                  placeholder="https://demo.traccar.org"
                  value={traccarUrl}
                  onChange={(e) => setTraccarUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tc-user">Utilisateur</Label>
                <Input id="tc-user" value={traccarUser} onChange={(e) => setTraccarUser(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="tc-pass">Mot de passe</Label>
                <Input
                  id="tc-pass"
                  type="password"
                  value={traccarPass}
                  onChange={(e) => setTraccarPass(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button type="button" onClick={persistSystemConfig} className="gap-2">
            <Save className="h-4 w-4" />
            Enregistrer la configuration
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IMEI par camion</CardTitle>
          <p className="text-sm text-muted-foreground font-normal">
            Activez le suivi et saisissez l’IMEI à 15 chiffres. Les camions actifs apparaissent sur la page Suivi GPS.
          </p>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 pt-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Camion</TableHead>
                  <TableHead>IMEI (15 chiffres)</TableHead>
                  <TableHead className="w-[100px]">Actif</TableHead>
                  <TableHead className="text-right w-[120px]"> </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucun camion — ajoutez-en depuis la page Camions.
                    </TableCell>
                  </TableRow>
                ) : (
                  trucks.map((t) => {
                    const b = bindingByTruck.get(t.id) ?? { truckId: t.id, imei: '', isActive: false };
                    return (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="font-medium">{t.immatriculation}</div>
                          <div className="text-xs text-muted-foreground">{t.modele}</div>
                        </TableCell>
                        <TableCell>
                          <Input
                            className="font-mono text-sm max-w-[220px]"
                            placeholder="352093081234567"
                            value={b.imei}
                            onChange={(e) =>
                              setBindings((prev) => {
                                const other = prev.filter((x) => x.truckId !== t.id);
                                return [...other, { ...b, imei: e.target.value.replace(/\D/g, '').slice(0, 15) }];
                              })
                            }
                            maxLength={15}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={b.isActive}
                            onCheckedChange={(on) =>
                              setBindings((prev) => {
                                const other = prev.filter((x) => x.truckId !== t.id);
                                return [...other, { ...b, isActive: on }];
                              })
                            }
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button type="button" size="sm" variant="secondary" onClick={() => saveRow(t.id)}>
                            Enregistrer
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
            <Badge variant="outline">Astuce</Badge>
            Page <span className="font-medium text-foreground">Test GPS</span> pour vérifier un IMEI avant mise en production.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
