import vine from '@vinejs/vine'
import User from '#models/user'

export const registerValidator = vine.compile(
  vine.object({
    fullName: vine.string().minLength(3).maxLength(255),
    email: vine
      .string()
      .email()
      .normalizeEmail()
      .unique(async (_db, value) => {
        const user = await User.findBy('email', value)
        return !user
      }),
    password: vine.string().minLength(8).maxLength(255),
  })
)
