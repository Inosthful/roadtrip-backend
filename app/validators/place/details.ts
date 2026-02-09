import vine from '@vinejs/vine'

/**
 * Validator pour récupérer les détails d'un lieu
 */
export const placeDetailsValidator = vine.compile(
  vine.object({
    placeId: vine.string().trim().minLength(1).maxLength(500),
  })
)
