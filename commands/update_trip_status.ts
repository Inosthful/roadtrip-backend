import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import TripStatusService from '#services/trip_status_service'

export default class UpdateTripStatus extends BaseCommand {
  static commandName = 'update:trip-status'
  static description = 'Met à jour le statut des voyages en fonction des dates du jour (à lancer chaque jour à minuit)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Lancement de la mise à jour des statuts (Ace Command)...')
    const service = new TripStatusService()

    try {
      const results = await service.handleStatusUpdates()
      
      if (results.activated > 0) {
        this.logger.success(`${results.activated} voyage(s) passé(s) en statut 'active'`)
      }
      if (results.completed > 0) {
        this.logger.success(`${results.completed} voyage(s) passé(s) en statut 'completed'`)
      }

      this.logger.info('Mise à jour terminée avec succès.')
    } catch (error) {
      this.logger.error('Erreur lors de la mise à jour des statuts des voyages')
      this.logger.error(error)
    }
  }
}
