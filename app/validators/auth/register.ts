import vine from '@vinejs/vine'

export const registerValidator = vine.compile(
  vine.object({
    fullName: vine.string().minLength(3).maxLength(255),
    email: vine.string().email().normalizeEmail(),
    password: vine.string().minLength(8).maxLength(255),
  })
)
