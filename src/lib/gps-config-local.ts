/**
 * Liaisons IMEI ↔ camion (localStorage). Utilisé par la page GPS, le suivi et la liste camions.
 */

export const GPS_CONFIGS_STORAGE_KEY = 'gps_configs';

export interface TruckGpsBinding {
  truckId: string;
  imei: string;
  isActive: boolean;
}

export function readGpsBindings(): TruckGpsBinding[] {
  try {
    const s = localStorage.getItem(GPS_CONFIGS_STORAGE_KEY);
    const raw = s ? JSON.parse(s) : [];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x: unknown) => x && typeof x === 'object' && 'truckId' in (x as object))
      .map((x: Record<string, unknown>) => ({
        truckId: String(x.truckId),
        imei: String(x.imei ?? ''),
        isActive: Boolean(x.isActive),
      }));
  } catch {
    return [];
  }
}

export function writeGpsBindings(bindings: TruckGpsBinding[]): void {
  localStorage.setItem(GPS_CONFIGS_STORAGE_KEY, JSON.stringify(bindings));
}

export function upsertTruckGpsBinding(binding: TruckGpsBinding): void {
  const rest = readGpsBindings().filter((b) => b.truckId !== binding.truckId);
  writeGpsBindings([...rest, binding]);
}

export function getBindingForTruck(truckId: string): TruckGpsBinding | undefined {
  return readGpsBindings().find((b) => b.truckId === truckId);
}

export function truckHasActiveGps(truckId: string): boolean {
  const b = getBindingForTruck(truckId);
  return Boolean(b?.isActive && b.imei && b.imei.length === 15);
}
