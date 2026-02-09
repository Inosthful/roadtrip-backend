import type { HttpContext } from '@adonisjs/core/http'
import { GooglePlacesService } from '#services/google_places_service'
import { autocompleteValidator } from '#validators/place/autocomplete'
import { placeDetailsValidator } from '#validators/place/details'

/**
 * Controller pour les endpoints Google Places API
 *
 * Routes :
 * - GET /places/autocomplete?query=Paris
 * - GET /places/details/:placeId
 */
export default class PlacesController {
  private placesService: GooglePlacesService

  constructor() {
    this.placesService = new GooglePlacesService()
  }

  /**
   * Autocomplete - Suggestions d'adresses
   *
   * GET /places/autocomplete?query=Paris
   *
   * Response:
   * {
   *   "suggestions": [
   *     {
   *       "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
   *       "text": "Paris, France",
   *       "description": "Paris"
   *     }
   *   ]
   * }
   */
  async autocomplete({ request, response }: HttpContext) {
    try {
      // Validation de la query
      const { query } = await request.validateUsing(autocompleteValidator)

      // Appel au service
      const result = await this.placesService.autocomplete(query)

      // Retour des suggestions
      return response.ok(result)
    } catch (error) {
      // Gestion des erreurs
      if (error instanceof Error) {
        return response.badRequest({
          error: "Erreur lors de l'autocomplete",
          message: error.message,
        })
      }
      return response.internalServerError({
        error: 'Erreur interne du serveur',
      })
    }
  }

  /**
   * Place Details - Détails complets d'un lieu
   *
   * GET /places/details/:placeId
   *
   * Response:
   * {
   *   "placeId": "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",
   *   "displayName": "Paris",
   *   "formattedAddress": "Paris, France",
   *   "location": {
   *     "latitude": 48.856614,
   *     "longitude": 2.3522219
   *   }
   * }
   */
  async details({ params, response }: HttpContext) {
    try {
      // Validation du placeId
      const { placeId } = await params

      // Validation avec VineJS
      const validated = await placeDetailsValidator.validate({ placeId })

      // Appel au service
      const result = await this.placesService.getPlaceDetails(validated.placeId)

      // Retour des détails
      return response.ok(result)
    } catch (error) {
      // Gestion des erreurs
      if (error instanceof Error) {
        return response.badRequest({
          error: 'Erreur lors de la récupération des détails',
          message: error.message,
        })
      }
      return response.internalServerError({
        error: 'Erreur interne du serveur',
      })
    }
  }
}
