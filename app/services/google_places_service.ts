import env from '#start/env'

/**
 * Service pour interagir avec l'API Google Places (New)
 *
 * Documentation officielle :
 * https://developers.google.com/maps/documentation/places/web-service/op-overview
 */
export class GooglePlacesService {
  private readonly apiKey: string
  private readonly baseUrl = 'https://places.googleapis.com/v1'

  constructor() {
    this.apiKey = env.get('GOOGLE_PLACES_API_KEY')
  }

  /**
   * Autocomplete - Suggestions d'adresses en temps réel
   *
   * Utilisé pour : Quand l'utilisateur tape dans un champ d'adresse
   *
   * @param query - Texte recherché (ex: "Paris", "Restaurant Lyon")
   * @returns Liste de suggestions avec placeId
   */
  async autocomplete(query: string): Promise<AutocompleteResult> {
    // Validation du paramètre
    if (!query || query.trim().length < 2) {
      throw new Error('La recherche doit contenir au moins 2 caractères')
    }

    try {
      // Appel à l'API Google Places Autocomplete (New)
      const response = await fetch(`${this.baseUrl}/places:autocomplete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': this.apiKey,
        },
        body: JSON.stringify({
          input: query.trim(),
          // Optionnel : Limiter aux adresses francophones
          languageCode: 'fr',
        }),
        // Timeout de 5 secondes
        signal: AbortSignal.timeout(5000),
      })

      // Gestion des erreurs HTTP
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Erreur API Google Places (${response.status}): ${errorBody}`)
      }

      // Parse de la réponse JSON
      const data = (await response.json()) as AutocompleteResult

      // Transformation des résultats pour notre API
      return {
        suggestions: (data.suggestions || []).map((suggestion: any) => ({
          placeId: suggestion.placePrediction?.placeId || null,
          text: suggestion.placePrediction?.text?.text || '',
          description: suggestion.placePrediction?.structuredFormat?.mainText?.text || '',
        })),
      }
    } catch (error) {
      // Gestion des erreurs (timeout, réseau, etc.)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error("Timeout: L'API Google Places met trop de temps à répondre")
        }
        throw new Error(`Erreur lors de l'autocomplete: ${error.message}`)
      }
      throw new Error("Erreur inconnue lors de l'autocomplete")
    }
  }

  /**
   * Get Place Details - Récupérer les détails complets d'un lieu
   *
   * Utilisé pour : Quand l'utilisateur sélectionne une suggestion
   * On récupère les coordonnées GPS, l'adresse complète, etc.
   *
   * @param placeId - ID du lieu (obtenu via autocomplete)
   * @returns Détails du lieu avec coordonnées
   */
  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    // Validation du paramètre
    if (!placeId || placeId.trim().length === 0) {
      throw new Error('Le placeId est requis')
    }

    try {
      // Appel à l'API Google Places - Get Place Details
      const response = await fetch(`${this.baseUrl}/places/${placeId}`, {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': this.apiKey,
          // ⚠️ Header OBLIGATOIRE : Spécifie les champs à retourner
          'X-Goog-FieldMask': 'displayName,formattedAddress,location',
        },
        // PAS de body pour une requête GET !
        signal: AbortSignal.timeout(5000),
      })

      // Gestion des erreurs HTTP
      if (!response.ok) {
        const errorBody = await response.text()
        throw new Error(`Erreur API Google Places (${response.status}): ${errorBody}`)
      }

      // Parse de la réponse JSON
      const data = (await response.json()) as GooglePlaceDetailsResponse

      // Transformation des résultats pour notre API
      return {
        placeId: placeId,
        displayName: data.displayName?.text || '',
        formattedAddress: data.formattedAddress || '',
        location: {
          latitude: data.location?.latitude || 0,
          longitude: data.location?.longitude || 0,
        },
      }
    } catch (error) {
      // Gestion des erreurs (timeout, réseau, etc.)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error("Timeout: L'API Google Places met trop de temps à répondre")
        }
        throw new Error(`Erreur lors de la récupération des détails: ${error.message}`)
      }
      throw new Error('Erreur inconnue lors de la récupération des détails')
    }
  }
}
/**
 * Types TypeScript pour les réponses
 */

// Réponse de l'API Google Places pour autocomplete
export interface AutocompleteResult {
  suggestions: AutocompleteSuggestion[]
}

// Réponse interne de l'API Google Places (structure brute)
interface GooglePlaceDetailsResponse {
  displayName?: {
    text: string
    languageCode?: string
  }
  formattedAddress?: string
  location?: {
    latitude: number
    longitude: number
  }
}

export interface AutocompleteSuggestion {
  placeId: string | null
  text: string
  description: string
}

export interface PlaceDetails {
  placeId: string
  displayName: string
  formattedAddress: string
  location: {
    latitude: number
    longitude: number
  }
}
