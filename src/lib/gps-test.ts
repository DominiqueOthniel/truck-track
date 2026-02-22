/**
 * Utilitaires pour tester la connexion GPS avec un IMEI
 */

export interface GPSTestResult {
  success: boolean;
  imei: string;
  timestamp: string;
  position?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  signal?: {
    strength: number; // 0-100
    satellites: number;
  };
  error?: string;
}

/**
 * Simule un test de connexion GPS avec un IMEI
 * Dans un vrai système, cela ferait une requête à votre serveur/API GPS
 */
export async function testGPSConnection(imei: string): Promise<GPSTestResult> {
  // Validation de l'IMEI
  if (!imei || imei.length !== 15 || !/^\d{15}$/.test(imei)) {
    return {
      success: false,
      imei,
      timestamp: new Date().toISOString(),
      error: 'IMEI invalide. Doit contenir exactement 15 chiffres.',
    };
  }

  // Simulation d'un délai de connexion
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Simulation d'un test de connexion
  // Dans un vrai système, vous feriez une requête HTTP à votre serveur GPS
  // Exemple: const response = await fetch(`https://votre-serveur-gps.com/api/test?imei=${imei}`);
  
  const randomSuccess = Math.random() > 0.2; // 80% de chance de succès (simulation)

  if (!randomSuccess) {
    return {
      success: false,
      imei,
      timestamp: new Date().toISOString(),
      error: 'Impossible de se connecter à l\'appareil GPS. Vérifiez que l\'appareil est allumé et que la carte SIM a du crédit.',
    };
  }

  // Simulation d'une position GPS (coordonnées du Cameroun)
  const cameroonBounds = {
    lat: { min: 1.5, max: 13.0 },
    lng: { min: 8.0, max: 16.0 },
  };

  const latitude = cameroonBounds.lat.min + Math.random() * (cameroonBounds.lat.max - cameroonBounds.lat.min);
  const longitude = cameroonBounds.lng.min + Math.random() * (cameroonBounds.lng.max - cameroonBounds.lng.min);

  return {
    success: true,
    imei,
    timestamp: new Date().toISOString(),
    position: {
      latitude: parseFloat(latitude.toFixed(6)),
      longitude: parseFloat(longitude.toFixed(6)),
      address: 'Position GPS récupérée',
    },
    signal: {
      strength: Math.floor(60 + Math.random() * 40), // 60-100%
      satellites: Math.floor(8 + Math.random() * 8), // 8-16 satellites
    },
  };
}

/**
 * Envoie une commande de test à l'appareil GPS
 * Dans un vrai système, cela enverrait une commande SMS ou HTTP à l'appareil
 */
export async function sendTestCommand(imei: string, simNumber?: string): Promise<{ success: boolean; message: string }> {
  if (!imei || imei.length !== 15) {
    return {
      success: false,
      message: 'IMEI invalide',
    };
  }

  // Simulation d'envoi de commande
  // Dans un vrai système, vous enverriez une commande SMS ou HTTP
  // Exemple: await fetch(`https://votre-serveur.com/api/gps/command`, {
  //   method: 'POST',
  //   body: JSON.stringify({ imei, command: 'LOCATION' })
  // });

  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    success: true,
    message: simNumber 
      ? `Commande de test envoyée à l'appareil ${imei} via SMS (${simNumber})`
      : `Commande de test envoyée à l'appareil ${imei}`,
  };
}

/**
 * Vérifie le format d'un IMEI
 */
export function validateIMEI(imei: string): { valid: boolean; error?: string } {
  if (!imei) {
    return { valid: false, error: 'IMEI requis' };
  }

  if (imei.length !== 15) {
    return { valid: false, error: 'L\'IMEI doit contenir exactement 15 chiffres' };
  }

  if (!/^\d{15}$/.test(imei)) {
    return { valid: false, error: 'L\'IMEI ne doit contenir que des chiffres' };
  }

  // Vérification de la clé de contrôle (algorithme de Luhn)
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(imei[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  const isValid = checkDigit === parseInt(imei[14]);

  if (!isValid) {
    return { valid: false, error: 'IMEI invalide (clé de contrôle incorrecte)' };
  }

  return { valid: true };
}

/**
 * Génère une URL de test pour visualiser la position sur une carte
 */
export function getMapUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
