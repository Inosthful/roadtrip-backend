import Trip from '#models/trip'
import { DateTime } from 'luxon'

export default class TripStatusService {
  /**
   * Met à jour les statuts des voyages en fonction de la date actuelle.
   * Retourne un résumé des modifications.
   */
  public async handleStatusUpdates() {
    const today = DateTime.now().toISODate() // 'YYYY-MM-DD'
    const results = { activated: 0, completed: 0 }

    try {
      // 1. planning -> active (si la date de début est passée ou aujourd'hui)
      const activated = await Trip.query()
        .where('status', 'planning')
        .where('startDate', '<=', today!)
        .update({ status: 'active' })
      
      results.activated = activated[0]

      // 2. active -> completed (si la date de fin est passée ou aujourd'hui)
      const completed = await Trip.query()
        .where('status', 'active')
        .where('endDate', '<=', today!)
        .update({ status: 'completed' })
      
      results.completed = completed[0]

      return results
    } catch (error) {
      console.error('[TripStatusService] Erreur lors de la mise à jour des statuts:', error)
      throw error
    }
  }
}
