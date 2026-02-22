/**
 * Système de suivi GPS pour les camions
 * Supporte : Mode Simulation (démo) et Mode Réel (Traccar API)
 */

export interface TruckLocation {
  truckId: string;
  imei: string;
  latitude: number;
  longitude: number;
  address?: string;
  timestamp: string;
  speed?: number; // km/h
  heading?: number; // degrés (0-360)
  signal?: {
    strength: number; // 0-100
    satellites: number;
  };
  isInTrip?: boolean;
  tripId?: string;
  source?: 'simulation' | 'traccar' | 'api'; // Source des données
}

export interface TruckLocationHistory {
  truckId: string;
  locations: TruckLocation[];
}

// Informations du trajet pour la simulation
export interface TripInfo {
  id: string;
  origine: string;
  destination: string;
  /** Coordonnées explicites (prioritaires sur le nom de ville) */
  origineLat?: number;
  origineLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  dateDepart: string;
}

// Configuration GPS
export interface GPSConfig {
  mode: 'simulation' | 'traccar' | 'custom_api';
  traccar?: {
    serverUrl: string; // Ex: http://localhost:8082 ou https://demo.traccar.org
    username: string;
    password: string;
  };
  customApi?: {
    url: string;
    apiKey?: string;
  };
}

// Configuration par défaut (mode simulation)
let gpsConfig: GPSConfig = {
  mode: 'simulation',
};

// Charger la configuration depuis localStorage
export function loadGPSConfig(): GPSConfig {
  const saved = localStorage.getItem('gps_system_config');
  if (saved) {
    gpsConfig = JSON.parse(saved);
  }
  return gpsConfig;
}

// Sauvegarder la configuration
export function saveGPSConfig(config: GPSConfig): void {
  gpsConfig = config;
  localStorage.setItem('gps_system_config', JSON.stringify(config));
}

// Obtenir la configuration actuelle
export function getGPSConfig(): GPSConfig {
  return gpsConfig;
}

// ============================================================
// VILLES DU CAMEROUN POUR LA SIMULATION
// ============================================================
const cameroonCities = [
  { name: 'Douala', lat: 4.0511, lng: 9.7679, aliases: ['douala', 'dla'] },
  { name: 'Yaoundé', lat: 3.8480, lng: 11.5021, aliases: ['yaounde', 'yde', 'yaoundé'] },
  { name: 'Garoua', lat: 9.3014, lng: 13.3981, aliases: ['garoua'] },
  { name: 'Maroua', lat: 10.5953, lng: 14.3157, aliases: ['maroua'] },
  { name: 'Bafoussam', lat: 5.4737, lng: 10.4179, aliases: ['bafoussam'] },
  { name: 'Bamenda', lat: 5.9527, lng: 10.1582, aliases: ['bamenda'] },
  { name: 'Kribi', lat: 2.9373, lng: 9.9103, aliases: ['kribi'] },
  { name: 'Buea', lat: 4.1560, lng: 9.2632, aliases: ['buea'] },
  { name: 'Ngaoundéré', lat: 7.3167, lng: 13.5833, aliases: ['ngaoundere', 'ngaoundéré'] },
  { name: 'Bertoua', lat: 4.5833, lng: 13.6833, aliases: ['bertoua'] },
  { name: 'Ebolowa', lat: 2.9000, lng: 11.1500, aliases: ['ebolowa'] },
  { name: 'Limbé', lat: 4.0186, lng: 9.2043, aliases: ['limbe', 'limbé'] },
  { name: 'Nkongsamba', lat: 4.9547, lng: 9.9404, aliases: ['nkongsamba'] },
  { name: 'Kumba', lat: 4.6363, lng: 9.4469, aliases: ['kumba'] },
  { name: 'Edéa', lat: 3.8000, lng: 10.1333, aliases: ['edea', 'edéa'] },
  { name: 'Loum', lat: 4.7167, lng: 9.7333, aliases: ['loum'] },
  { name: 'Mbalmayo', lat: 3.5167, lng: 11.5000, aliases: ['mbalmayo'] },
  { name: 'Dschang', lat: 5.4500, lng: 10.0667, aliases: ['dschang'] },
  { name: 'Foumban', lat: 5.7167, lng: 10.9000, aliases: ['foumban'] },
  { name: 'Sangmélima', lat: 2.9333, lng: 11.9833, aliases: ['sangmelima', 'sangmélima'] },
];

/**
 * Trouve une ville par son nom (recherche flexible)
 */
function findCityByName(name: string): { name: string; lat: number; lng: number } | null {
  if (!name) return null;
  
  const normalizedName = name.toLowerCase().trim();
  
  // Chercher dans les villes connues
  for (const city of cameroonCities) {
    if (city.name.toLowerCase() === normalizedName) {
      return { name: city.name, lat: city.lat, lng: city.lng };
    }
    // Chercher dans les aliases
    if (city.aliases.some(alias => normalizedName.includes(alias) || alias.includes(normalizedName))) {
      return { name: city.name, lat: city.lat, lng: city.lng };
    }
  }
  
  // Si non trouvé, chercher une correspondance partielle
  for (const city of cameroonCities) {
    if (normalizedName.includes(city.name.toLowerCase()) || city.name.toLowerCase().includes(normalizedName)) {
      return { name: city.name, lat: city.lat, lng: city.lng };
    }
  }
  
  return null;
}

// Stockage des positions simulées (pour persistance entre appels)
const simulatedPositions: Map<string, {
  currentLat: number;
  currentLng: number;
  targetLat: number;
  targetLng: number;
  heading: number;
  speed: number;
  lastUpdate: number;
  currentCity: string;
  targetCity: string;
  currentTripId?: string; // Pour détecter les changements de trajet
}> = new Map();

/**
 * Réinitialise la position simulée d'un camion (utile lors du lancement d'un nouveau trajet)
 */
export function resetSimulatedPosition(imei: string): void {
  simulatedPositions.delete(imei);
}

/**
 * Initialise ou met à jour la position simulée d'un camion
 * Si tripInfo est fourni, utilise les villes du trajet
 */
function initSimulatedPosition(imei: string, isInTrip: boolean, tripInfo?: TripInfo): void {
  const existing = simulatedPositions.get(imei);
  const now = Date.now();
  
  // Trouver les villes de départ et d'arrivée
  let startCity = cameroonCities[Math.abs(hashCode(imei)) % cameroonCities.length];
  let targetCity = cameroonCities[(Math.abs(hashCode(imei)) + 1) % cameroonCities.length];
  
  // Si on a les informations du trajet, utiliser origine/destination (coordonnées explicites prioritaire)
  if (tripInfo && isInTrip) {
    if (tripInfo.origineLat != null && tripInfo.origineLng != null) {
      startCity = { name: tripInfo.origine, lat: tripInfo.origineLat, lng: tripInfo.origineLng, aliases: [] };
    } else {
      const origineCity = findCityByName(tripInfo.origine);
      if (origineCity) startCity = { ...origineCity, aliases: [] };
    }
    if (tripInfo.destinationLat != null && tripInfo.destinationLng != null) {
      targetCity = { name: tripInfo.destination, lat: tripInfo.destinationLat, lng: tripInfo.destinationLng, aliases: [] };
    } else {
      const destinationCity = findCityByName(tripInfo.destination);
      if (destinationCity) targetCity = { ...destinationCity, aliases: [] };
    }
  }
  
  // Vérifier si c'est un nouveau trajet (différent du précédent)
  const isNewTrip = tripInfo && existing && existing.currentTripId !== tripInfo.id;
  
  if (!existing || isNewTrip) {
    // Nouvelle position OU nouveau trajet - démarrer depuis la ville d'origine
    simulatedPositions.set(imei, {
      currentLat: startCity.lat + (Math.random() - 0.5) * 0.01,
      currentLng: startCity.lng + (Math.random() - 0.5) * 0.01,
      targetLat: targetCity.lat,
      targetLng: targetCity.lng,
      heading: 0,
      speed: isInTrip ? 60 : 0, // Démarrer avec une vitesse si en trajet
      lastUpdate: now,
      currentCity: startCity.name,
      targetCity: targetCity.name,
      currentTripId: tripInfo?.id,
    });
    
    if (isNewTrip) {
      console.log(`🚚 Nouveau trajet détecté: ${startCity.name} → ${targetCity.name}`);
    }
  } else if (tripInfo && isInTrip) {
    // Trajet existant - mettre à jour la destination si elle a changé
    const destinationCity = findCityByName(tripInfo.destination);
    if (destinationCity && existing.targetCity !== destinationCity.name) {
      existing.targetLat = destinationCity.lat;
      existing.targetLng = destinationCity.lng;
      existing.targetCity = destinationCity.name;
      console.log(`🚚 Destination mise à jour: → ${destinationCity.name}`);
    }
    existing.currentTripId = tripInfo.id;
  } else if (!isInTrip && existing.currentTripId) {
    // Le trajet est terminé
    existing.currentTripId = undefined;
    existing.speed = 0;
    console.log(`🚚 Trajet terminé, camion stationné à ${existing.currentCity}`);
  }
}

/**
 * Met à jour la position simulée (mouvement réaliste)
 * Utilise tripInfo pour définir la destination réelle
 */
function updateSimulatedPosition(imei: string, isInTrip: boolean, tripInfo?: TripInfo): void {
  const pos = simulatedPositions.get(imei);
  if (!pos) return;
  
  const now = Date.now();
  const deltaTime = (now - pos.lastUpdate) / 1000; // en secondes
  
  if (isInTrip && deltaTime > 0) {
    // Si on a les infos du trajet, s'assurer que la destination est correcte
    if (tripInfo) {
      const targetLat = tripInfo.destinationLat != null ? tripInfo.destinationLat : findCityByName(tripInfo.destination)?.lat;
      const targetLng = tripInfo.destinationLng != null ? tripInfo.destinationLng : findCityByName(tripInfo.destination)?.lng;
      if (targetLat != null && targetLng != null && (pos.targetLat !== targetLat || pos.targetLng !== targetLng)) {
        pos.targetLat = targetLat;
        pos.targetLng = targetLng;
        pos.targetCity = tripInfo.destination;
      }
    }
    
    // Calculer la direction vers la cible
    const dLat = pos.targetLat - pos.currentLat;
    const dLng = pos.targetLng - pos.currentLng;
    const distance = Math.sqrt(dLat * dLat + dLng * dLng);
    
    // Vitesse réaliste (50-90 km/h en trajet, converti en degrés/seconde)
    // ~1 degré = ~111 km, donc 70 km/h = 70/111/3600 degrés/seconde
    const speedKmh = 50 + Math.random() * 40;
    const speedDegPerSec = speedKmh / 111 / 3600;
    
    if (distance > 0.01) {
      // Se déplacer vers la cible
      const ratio = Math.min(speedDegPerSec * deltaTime / distance, 1);
      pos.currentLat += dLat * ratio;
      pos.currentLng += dLng * ratio;
      
      // Calculer le cap (heading)
      pos.heading = Math.round((Math.atan2(dLng, dLat) * 180 / Math.PI + 360) % 360);
      pos.speed = Math.round(speedKmh);
    } else {
      // Arrivé à destination
      pos.currentCity = pos.targetCity;
      pos.speed = 0;
      
      // Si pas de trajet défini, choisir une nouvelle cible aléatoire
      if (!tripInfo) {
        const newTargetCity = cameroonCities[Math.floor(Math.random() * cameroonCities.length)];
        pos.targetLat = newTargetCity.lat + (Math.random() - 0.5) * 0.02;
        pos.targetLng = newTargetCity.lng + (Math.random() - 0.5) * 0.02;
        pos.targetCity = newTargetCity.name;
      }
    }
  } else {
    // Stationné - petits mouvements aléatoires
    pos.currentLat += (Math.random() - 0.5) * 0.0001;
    pos.currentLng += (Math.random() - 0.5) * 0.0001;
    pos.speed = Math.floor(Math.random() * 5);
    pos.heading = Math.floor(Math.random() * 360);
  }
  
  pos.lastUpdate = now;
}

/**
 * Fonction de hash simple pour générer des valeurs cohérentes basées sur l'IMEI
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Récupère la position depuis Traccar API
 */
async function getTraccarLocation(imei: string, truckId: string, tripId?: string): Promise<TruckLocation | null> {
  const config = gpsConfig.traccar;
  if (!config) return null;

  try {
    // 1. D'abord, obtenir la liste des appareils pour trouver l'ID Traccar correspondant à l'IMEI
    const authHeader = 'Basic ' + btoa(`${config.username}:${config.password}`);
    
    const devicesResponse = await fetch(`${config.serverUrl}/api/devices`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!devicesResponse.ok) {
      console.error('Erreur Traccar devices:', devicesResponse.status);
      return null;
    }

    const devices = await devicesResponse.json();
    const device = devices.find((d: any) => d.uniqueId === imei);
    
    if (!device) {
      console.warn(`Appareil avec IMEI ${imei} non trouvé dans Traccar`);
      return null;
    }

    // 2. Obtenir la dernière position de l'appareil
    const positionsResponse = await fetch(`${config.serverUrl}/api/positions?deviceId=${device.id}`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!positionsResponse.ok) {
      console.error('Erreur Traccar positions:', positionsResponse.status);
      return null;
    }

    const positions = await positionsResponse.json();
    if (positions.length === 0) {
      console.warn(`Aucune position pour l'appareil ${imei}`);
      return null;
    }

    const latestPosition = positions[0];

    return {
      truckId,
      imei,
      latitude: latestPosition.latitude,
      longitude: latestPosition.longitude,
      address: latestPosition.address || 'Adresse non disponible',
      timestamp: latestPosition.deviceTime || new Date().toISOString(),
      speed: latestPosition.speed ? Math.round(latestPosition.speed * 1.852) : 0, // nœuds vers km/h
      heading: latestPosition.course ? Math.round(latestPosition.course) : undefined,
      signal: {
        strength: latestPosition.attributes?.sat ? Math.min(100, latestPosition.attributes.sat * 10) : 50,
        satellites: latestPosition.attributes?.sat || 0,
      },
      isInTrip: !!tripId,
      tripId,
      source: 'traccar',
    };
  } catch (error) {
    console.error('Erreur lors de la récupération Traccar:', error);
    return null;
  }
}

/**
 * Récupère la position simulée (avec mouvement réaliste)
 * Utilise tripInfo pour positionner le camion selon l'origine et la destination du trajet
 */
async function getSimulatedLocation(imei: string, truckId: string, tripInfo?: TripInfo): Promise<TruckLocation | null> {
  if (!imei || imei.length !== 15) {
    return null;
  }

  // Simulation d'un délai réseau
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));

  const isInTrip = !!tripInfo;
  
  // Initialiser ou mettre à jour la position avec les infos du trajet
  initSimulatedPosition(imei, isInTrip, tripInfo);
  updateSimulatedPosition(imei, isInTrip, tripInfo);
  
  const pos = simulatedPositions.get(imei)!;
  
  // Trouver la ville la plus proche pour l'adresse
  let nearestCity = cameroonCities[0];
  let minDistance = Infinity;
  for (const city of cameroonCities) {
    const dist = Math.sqrt(Math.pow(city.lat - pos.currentLat, 2) + Math.pow(city.lng - pos.currentLng, 2));
    if (dist < minDistance) {
      minDistance = dist;
      nearestCity = city;
    }
  }
  
  // Générer l'adresse avec indication de la direction si en trajet
  let address = minDistance < 0.1 
    ? `${nearestCity.name}, Cameroun`
    : `À ${Math.round(minDistance * 111)} km de ${nearestCity.name}`;
    
  if (isInTrip && tripInfo) {
    address += ` → ${tripInfo.destination}`;
  }

  return {
    truckId,
    imei,
    latitude: parseFloat(pos.currentLat.toFixed(6)),
    longitude: parseFloat(pos.currentLng.toFixed(6)),
    address,
    timestamp: new Date().toISOString(),
    speed: pos.speed > 0 ? pos.speed : undefined,
    heading: pos.heading,
    signal: {
      strength: Math.floor(70 + Math.random() * 30), // 70-100%
      satellites: Math.floor(8 + Math.random() * 8), // 8-16 satellites
    },
    isInTrip,
    tripId: tripInfo?.id,
    source: 'simulation',
  };
}

/**
 * Récupère la position actuelle d'un camion via son IMEI
 * Utilise le mode configuré (simulation ou Traccar)
 * tripInfo contient les informations du trajet (origine, destination) pour la simulation
 */
export async function getTruckLocation(imei: string, truckId: string, tripInfo?: TripInfo): Promise<TruckLocation | null> {
  loadGPSConfig();
  
  switch (gpsConfig.mode) {
    case 'traccar':
      const traccarLocation = await getTraccarLocation(imei, truckId, tripInfo?.id);
      // Fallback vers simulation si Traccar échoue
      if (!traccarLocation) {
        console.warn('Traccar non disponible, utilisation de la simulation');
        return getSimulatedLocation(imei, truckId, tripInfo);
      }
      return traccarLocation;
      
    case 'simulation':
    default:
      return getSimulatedLocation(imei, truckId, tripInfo);
  }
}

/**
 * Récupère les positions de tous les camions avec GPS configuré
 * tripInfo est optionnel et contient les infos du trajet pour chaque camion
 */
export async function getAllTruckLocations(
  trucksWithGPS: Array<{ truckId: string; imei: string; tripInfo?: TripInfo }>
): Promise<TruckLocation[]> {
  const locations = await Promise.all(
    trucksWithGPS.map(({ truckId, imei, tripInfo }) => getTruckLocation(imei, truckId, tripInfo))
  );
  return locations.filter((loc): loc is TruckLocation => loc !== null);
}

/**
 * Sauvegarde l'historique de localisation d'un camion
 */
export function saveLocationHistory(truckId: string, location: TruckLocation): void {
  const key = `gps_history_${truckId}`;
  const existing = localStorage.getItem(key);
  const history: TruckLocationHistory = existing ? JSON.parse(existing) : { truckId, locations: [] };
  
  history.locations.push(location);
  
  // Garder seulement les 100 dernières positions
  if (history.locations.length > 100) {
    history.locations = history.locations.slice(-100);
  }
  
  localStorage.setItem(key, JSON.stringify(history));
}

/**
 * Récupère l'historique de localisation d'un camion
 */
export function getLocationHistory(truckId: string): TruckLocation[] {
  const key = `gps_history_${truckId}`;
  const existing = localStorage.getItem(key);
  if (!existing) return [];
  
  const history: TruckLocationHistory = JSON.parse(existing);
  return history.locations;
}

/**
 * Génère une URL Google Maps pour une position
 */
export function getMapUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}

/**
 * Génère une URL Google Maps avec plusieurs marqueurs
 */
export function getMapUrlWithMarkers(locations: TruckLocation[]): string {
  if (locations.length === 0) return '';
  if (locations.length === 1) {
    return getMapUrl(locations[0].latitude, locations[0].longitude);
  }
  
  // Pour plusieurs marqueurs, utiliser l'API Google Maps avec des paramètres
  const centerLat = locations.reduce((sum, loc) => sum + loc.latitude, 0) / locations.length;
  const centerLng = locations.reduce((sum, loc) => sum + loc.longitude, 0) / locations.length;
  
  // Créer des marqueurs pour chaque position
  const markers = locations.map((loc, index) => 
    `markers=color:red%7Clabel:${index + 1}%7C${loc.latitude},${loc.longitude}`
  ).join('&');
  
  return `https://www.google.com/maps?${markers}&center=${centerLat},${centerLng}&zoom=8`;
}

// ============================================================
// FONCTIONS UTILITAIRES POUR L'INTÉGRATION TRACCAR
// ============================================================

export interface TraccarTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  devicesCount?: number;
  error?: string;
}

/**
 * Teste la connexion au serveur Traccar
 */
export async function testTraccarConnection(config: GPSConfig['traccar']): Promise<TraccarTestResult> {
  if (!config) {
    return { success: false, message: 'Configuration Traccar manquante', error: 'NO_CONFIG' };
  }

  try {
    const authHeader = 'Basic ' + btoa(`${config.username}:${config.password}`);
    
    // Test 1: Vérifier l'authentification avec /api/session
    const sessionResponse = await fetch(`${config.serverUrl}/api/session`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!sessionResponse.ok) {
      if (sessionResponse.status === 401) {
        return { success: false, message: 'Identifiants incorrects', error: 'AUTH_FAILED' };
      }
      return { 
        success: false, 
        message: `Erreur serveur: ${sessionResponse.status}`, 
        error: `HTTP_${sessionResponse.status}` 
      };
    }

    // Test 2: Récupérer le nombre d'appareils
    const devicesResponse = await fetch(`${config.serverUrl}/api/devices`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    let devicesCount = 0;
    if (devicesResponse.ok) {
      const devices = await devicesResponse.json();
      devicesCount = devices.length;
    }

    // Test 3: Récupérer la version du serveur (si disponible)
    const serverResponse = await fetch(`${config.serverUrl}/api/server`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    let serverVersion = 'Inconnue';
    if (serverResponse.ok) {
      const serverInfo = await serverResponse.json();
      serverVersion = serverInfo.version || 'Non spécifiée';
    }

    return {
      success: true,
      message: `Connexion réussie au serveur Traccar`,
      serverVersion,
      devicesCount,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    
    if (errorMessage.includes('fetch')) {
      return { 
        success: false, 
        message: 'Impossible de contacter le serveur. Vérifiez l\'URL et la connexion réseau.', 
        error: 'NETWORK_ERROR' 
      };
    }
    
    return { 
      success: false, 
      message: `Erreur: ${errorMessage}`, 
      error: 'UNKNOWN_ERROR' 
    };
  }
}

/**
 * Récupère la liste des appareils Traccar
 */
export async function getTraccarDevices(config: GPSConfig['traccar']): Promise<Array<{ id: number; name: string; uniqueId: string; status: string }>> {
  if (!config) return [];

  try {
    const authHeader = 'Basic ' + btoa(`${config.username}:${config.password}`);
    
    const response = await fetch(`${config.serverUrl}/api/devices`, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return [];

    const devices = await response.json();
    return devices.map((d: any) => ({
      id: d.id,
      name: d.name,
      uniqueId: d.uniqueId, // C'est l'IMEI
      status: d.status,
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des appareils Traccar:', error);
    return [];
  }
}

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 */
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calcule la distance totale parcourue à partir de l'historique
 */
export function calculateTotalDistance(locations: TruckLocation[]): number {
  if (locations.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 1; i < locations.length; i++) {
    totalDistance += calculateDistance(
      locations[i - 1].latitude,
      locations[i - 1].longitude,
      locations[i].latitude,
      locations[i].longitude
    );
  }
  
  return totalDistance;
}

/**
 * Obtient les statistiques de trajet
 */
export function getTrackingStats(locations: TruckLocation[]): {
  totalDistance: number;
  averageSpeed: number;
  maxSpeed: number;
  duration: number;
} {
  if (locations.length === 0) {
    return { totalDistance: 0, averageSpeed: 0, maxSpeed: 0, duration: 0 };
  }

  const totalDistance = calculateTotalDistance(locations);
  
  const speeds = locations.map(l => l.speed || 0).filter(s => s > 0);
  const averageSpeed = speeds.length > 0 
    ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
    : 0;
  const maxSpeed = speeds.length > 0 ? Math.max(...speeds) : 0;

  const firstTime = new Date(locations[0].timestamp).getTime();
  const lastTime = new Date(locations[locations.length - 1].timestamp).getTime();
  const duration = (lastTime - firstTime) / 1000 / 60; // en minutes

  return {
    totalDistance: Math.round(totalDistance * 10) / 10,
    averageSpeed,
    maxSpeed,
    duration: Math.round(duration),
  };
}
