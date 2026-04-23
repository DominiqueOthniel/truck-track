/**
 * Immatriculation tracteur + remorque saisie en un seul champ, ex. LTQE940-HGFIWOP
 * (une seule liaison tiret entre les deux plaques).
 */
const COUPLED_IMMAT = /^([A-Z0-9]{3,15})-([A-Z0-9]{3,15})$/;

export function normalizeImmatriculationPart(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

export function parseTractorTrailerImmatriculation(raw: string): { tracteur: string; remorque: string } | null {
  const normalized = normalizeImmatriculationPart(raw);
  const m = normalized.match(COUPLED_IMMAT);
  if (!m) return null;
  return { tracteur: m[1], remorque: m[2] };
}

export function isValidSoloTractorImmatriculation(raw: string): boolean {
  const s = normalizeImmatriculationPart(raw);
  if (s.length < 3 || s.length > 15) return false;
  if (s.includes('-')) return false;
  return /^[A-Z0-9]+$/.test(s);
}
