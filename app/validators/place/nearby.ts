import vine from '@vinejs/vine'

/**
 * Validator pour l'endpoint Nearby Search
 *
 * Query params attendus :
 * - latitude: number (requis, entre -90 et 90)
 * - longitude: number (requis, entre -180 et 180)
 * - radius: number (optionnel, entre 1 et 50000 mètres, défaut: 5000)
 * - types: string (optionnel, séparé par virgules, ex: "restaurant,cafe")
 * - limit: number (optionnel, entre 1 et 20, défaut: 10)
 */
export const nearbySearchValidator = vine.compile(
  vine.object({
    latitude: vine
      .number()
      .min(-90)
      .max(90)
      .parse((value) => {
        // Conversion string → number si nécessaire
        if (typeof value === 'string') {
          return Number.parseFloat(value)
        }
        return value
      }),
    longitude: vine
      .number()
      .min(-180)
      .max(180)
      .parse((value) => {
        // Conversion string → number si nécessaire
        if (typeof value === 'string') {
          return Number.parseFloat(value)
        }
        return value
      }),
    radius: vine
      .number()
      .min(1)
      .max(50000)
      .parse((value) => {
        if (typeof value === 'string') {
          return Number.parseFloat(value)
        }
        return value ?? 5000 // Défaut: 5km
      })
      .optional(),
    types: vine
      .string()
      .transform((value) => {
        // Transformation string "restaurant,cafe" → array ["restaurant", "cafe"]
        if (!value) return ['tourist_attraction'] // Défaut
        return value.split(',').map((type) => type.trim())
      })
      .optional(),
    limit: vine
      .number()
      .min(1)
      .max(20)
      .parse((value) => {
        if (typeof value === 'string') {
          return Number.parseInt(value)
        }
        return value ?? 10 // Défaut: 10 résultats
      })
      .optional(),
  })
)
