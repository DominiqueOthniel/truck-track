/**
 * Immatriculation tracteur + remorque saisie en un seul champ, ex. LTQE940-HGFIWOP
 * (une seule liaison tiret entre les deux plaques).
 */
const COUPLED_IMMAT = /^([A-Z0-9]{3,15})-([A-Z0-9]{3,15})$/;

export function normalizeImmatriculationPart(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '');
}

/** Tracteur ou remorque seule : lettres / chiffres uniquement, max 15. */
export function sanitizeSoloImmatriculationInput(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/\s/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 15);
}

/**
 * Couple tracteur-remorque : majuscules, espaces / caractères parasites retirés,
 * un seul tiret entre les deux blocs ; plusieurs tirets dans la partie remorque sont fusionnés.
 * Autorise « ABC- » pendant la saisie de la remorque.
 */
export function sanitizeCoupledImmatriculationInput(raw: string): string {
  let s = raw.toUpperCase().replace(/\s/g, '').replace(/[^A-Z0-9-]/g, '');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^-+/, '');
  if (!s) return '';

  const firstDash = s.indexOf('-');
  if (firstDash === -1) {
    return s.replace(/[^A-Z0-9]/g, '').slice(0, 15);
  }

  const left = s.slice(0, firstDash).replace(/[^A-Z0-9]/g, '').slice(0, 15);
  const rest = s.slice(firstDash + 1);
  const onlyMoreHyphens = rest.length === 0 || /^-+$/.test(rest);
  if (onlyMoreHyphens) {
    return left ? `${left}-` : '';
  }

  const right = rest.replace(/[^A-Z0-9]/g, '').slice(0, 15);
  if (!left) return right.slice(0, 15);
  if (!right) return left;
  return `${left}-${right}`;
}

export function parseTractorTrailerImmatriculation(raw: string): { tracteur: string; remorque: string } | null {
  const normalized = sanitizeCoupledImmatriculationInput(raw);
  const m = normalized.match(COUPLED_IMMAT);
  if (!m) return null;
  return { tracteur: m[1], remorque: m[2] };
}

export function isValidSoloTractorImmatriculation(raw: string): boolean {
  const s = sanitizeSoloImmatriculationInput(raw);
  if (s.length < 3 || s.length > 15) return false;
  return /^[A-Z0-9]+$/.test(s);
}
