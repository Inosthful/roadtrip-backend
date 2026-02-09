import vine from '@vinejs/vine'

/**
 * Validator pour l'autocomplete de lieux
 */
export const autocompleteValidator = vine.compile(
  vine.object({
    query: vine.string().trim().minLength(2).maxLength(200),
  })
)
