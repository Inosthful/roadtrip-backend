/**
 * Calcule la distance à vol d'oiseau entre deux points GPS
 * en utilisant la formule de Haversine
 *
 * @param lat1 Latitude du point 1 (en degrés)
 * @param lon1 Longitude du point 1 (en degrés)
 * @param lat2 Latitude du point 2 (en degrés)
 * @param lon2 Longitude du point 2 (en degrés)
 * @returns Distance en kilomètres
 *
 * @example
 * haversineDistance(48.8566, 2.3522, 45.7640, 4.8357)
 * // → 392.2 km (Paris → Lyon)
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Rayon de la Terre en kilomètres
  const R = 6371

  // Conversion degrés → radians
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  // Différences de latitude et longitude en radians
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  // Conversion des latitudes en radians
  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)

  // Formule de Haversine
  // a = sin²(Δlat/2) + cos(lat1) × cos(lat2) × sin²(Δlon/2)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  // c = 2 × atan2(√a, √(1−a))
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  // Distance = R × c
  return R * c
}

/**
 * Trouve le stop le plus proche d'un point donné
 * parmi une liste de stops
 *
 * @param currentLat Latitude actuelle
 * @param currentLon Longitude actuelle
 * @param stops Liste des stops à considérer
 * @returns Le stop le plus proche
 */
export function findNearestStop<T extends { latitude: number; longitude: number }>(
  currentLat: number,
  currentLon: number,
  stops: T[]
): T {
  let nearest = stops[0]
  let minDistance = Infinity

  for (const stop of stops) {
    const distance = haversineDistance(currentLat, currentLon, stop.latitude, stop.longitude)

    if (distance < minDistance) {
      minDistance = distance
      nearest = stop
    }
  }

  return nearest
}
