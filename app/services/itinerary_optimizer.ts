import type Stop from '#models/stop'
import { findNearestStop, haversineDistance } from '#helpers/distance'

/**
 * Service d'optimisation d'itinéraire
 *
 * Utilise l'algorithme du "Plus Proche Voisin" (Nearest Neighbor)
 * pour minimiser la distance totale du roadtrip
 *
 * Contraintes :
 * - Les stops avec is_locked=true gardent leur position
 * - Seuls les stops non-lockés sont réorganisés
 */
export class ItineraryOptimizer {
  /**
   * Optimise l'ordre des stops d'un itinéraire
   *
   * Algorithme :
   * 1. Séparer stops lockés / non-lockés
   * 2. Pour chaque segment entre 2 stops lockés :
   *    - Appliquer l'algo du plus proche voisin
   * 3. Reconstruire l'itinéraire final
   *
   * @param stops Liste des stops à optimiser (triés par ordre actuel)
   * @returns Liste des stops avec ordre optimisé
   */
  optimize(stops: Stop[]): Stop[] {
    if (stops.length <= 1) {
      return stops // Rien à optimiser
    }

    // Séparer les stops lockés et non-lockés
    const locked = stops.filter((s) => s.isLocked)
    const unlocked = stops.filter((s) => !s.isLocked)

    // Si tout est locké ou tout est délocké, cas simples
    if (locked.length === 0) {
      // Optimiser tout l'itinéraire
      return this.optimizeSegment(unlocked, null)
    }

    if (unlocked.length === 0) {
      // Rien à optimiser, garder l'ordre actuel
      return stops
    }

    // Cas complexe : mixer lockés et non-lockés
    return this.optimizeWithConstraints(stops, locked, unlocked)
  }

  /**
   * Optimise un itinéraire avec contraintes de stops lockés
   *
   * Principe :
   * - Les stops lockés créent des "segments"
   * - Chaque segment est optimisé indépendamment
   * - Les segments sont ensuite concaténés
   */
  private optimizeWithConstraints(
    _allStops: Stop[],
    lockedStops: Stop[],
    unlockedStops: Stop[]
  ): Stop[] {
    const optimized: Stop[] = []
    let remainingUnlocked = [...unlockedStops]

    // Trier les stops lockés par ordre actuel
    const sortedLocked = lockedStops.sort((a, b) => a.order - b.order)

    // Pour chaque segment entre stops lockés
    for (let i = 0; i < sortedLocked.length; i++) {
      const currentLocked = sortedLocked[i]
      const nextLocked = sortedLocked[i + 1]

      // Ajouter le stop locké
      optimized.push(currentLocked)

      // Trouver les stops non-lockés dans ce segment
      const segmentStops = remainingUnlocked.filter((stop) => {
        if (nextLocked) {
          // Entre currentLocked et nextLocked
          return stop.order > currentLocked.order && stop.order < nextLocked.order
        } else {
          // Après le dernier stop locké
          return stop.order > currentLocked.order
        }
      })

      if (segmentStops.length > 0) {
        // Optimiser ce segment
        const optimizedSegment = this.optimizeSegment(segmentStops, currentLocked)
        optimized.push(...optimizedSegment)

        // Retirer les stops traités
        remainingUnlocked = remainingUnlocked.filter((s) => !segmentStops.includes(s))
      }
    }

    // Gérer les stops non-lockés avant le premier stop locké
    const beforeFirst = unlockedStops.filter((stop) => stop.order < sortedLocked[0].order)
    if (beforeFirst.length > 0) {
      const optimizedBefore = this.optimizeSegment(beforeFirst, null)
      optimized.unshift(...optimizedBefore)
    }

    return optimized
  }

  /**
   * Optimise un segment de stops avec l'algorithme du plus proche voisin
   *
   * @param stops Stops à optimiser
   * @param startFrom Stop de départ (null = utiliser le premier stop)
   * @returns Stops optimisés
   */
  private optimizeSegment(stops: Stop[], startFrom: Stop | null): Stop[] {
    if (stops.length === 0) return []
    if (stops.length === 1) return stops

    const optimized: Stop[] = []
    let remaining = [...stops]

    // Point de départ
    let current: { latitude: number; longitude: number }

    if (startFrom) {
      current = { latitude: startFrom.latitude, longitude: startFrom.longitude }
    } else {
      // Commencer par le premier stop
      const first = remaining[0]
      optimized.push(first)
      remaining = remaining.slice(1)
      current = { latitude: first.latitude, longitude: first.longitude }
    }

    // Algorithme du plus proche voisin
    while (remaining.length > 0) {
      const nearest = findNearestStop(current.latitude, current.longitude, remaining)
      optimized.push(nearest)

      // Mettre à jour la position actuelle
      current = { latitude: nearest.latitude, longitude: nearest.longitude }

      // Retirer le stop visité
      remaining = remaining.filter((s) => s.id !== nearest.id)
    }

    return optimized
  }

  /**
   * Calcule la distance totale d'un itinéraire
   *
   * @param stops Liste des stops dans l'ordre
   * @returns Distance totale en km
   */
  calculateTotalDistance(stops: Stop[]): number {
    if (stops.length < 2) return 0

    let total = 0

    for (let i = 0; i < stops.length - 1; i++) {
      const current = stops[i]
      const next = stops[i + 1]
      total += haversineDistance(
        current.latitude,
        current.longitude,
        next.latitude,
        next.longitude
      )
    }

    return Math.round(total * 10) / 10 // Arrondir à 1 décimale
  }
}
