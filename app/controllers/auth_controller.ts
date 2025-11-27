import User from '#models/user'
import { loginValidator } from '#validators/auth/login'
import { registerValidator } from '#validators/auth/register'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const user = await User.create(payload)

    const token = await User.accessTokens.create(user)

    return response.created({
      message: 'User registered successfully',
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
        token: token.value!.release(),
      },
    })
  }

  async login({ request, response }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(payload.email, payload.password)
    const token = await User.accessTokens.create(user)
    return response.ok({
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
        token: token.value!.release(),
      },
    })
  }

  async logout({ auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return response.ok({
      message: 'Logout successful',
    })
  }

  async me({ auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    return response.ok({
      message: 'User information',
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
      },
    })
  }

  async update({ auth, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    const validator = vine.compile(
      vine.object({
        fullName: vine.string().optional(),
        email: vine
          .string()
          .email()
          .normalizeEmail()
          .unique(async (_db, value) => {
            if (!value) {
              return true
            }
            const existingUser = await User.findBy('email', value)
            return !existingUser || existingUser.id === user.id
          })
          .optional(),
      })
    )

    const payload = await request.validateUsing(validator)

    user.merge(payload)
    await user.save()

    return response.ok({
      message: 'User updated successfully',
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
        },
      },
    })
  }
}
