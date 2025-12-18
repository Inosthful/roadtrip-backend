import User from '#models/user'
import { loginValidator } from '#validators/auth/login'
import { registerValidator } from '#validators/auth/register'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import VerifyEmailNotification from '#mails/verify_email_notification'
import mail from '@adonisjs/mail/services/main'
import crypto from 'node:crypto'
import env from '#start/env'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const verificationToken = crypto.randomBytes(32).toString('hex')

    const user = await User.create({
      ...payload,
      isVerified: false,
      verificationToken: verificationToken,
    })

    // Construire l'URL de vérification (frontend URL si possible, sinon API direct qui redirige)
    // Ici on suppose que le lien pointe vers une route API qui valide et redirige,
    // OU vers une page frontend qui appelle l'API.
    // Faisons pointer vers l'API Backend pour valider directement pour simplifier la démo,
    // ou mieux: une URL frontend qui contient le token.

    // Comme je ne connais pas l'URL du frontend en prod/dev de manière sûre autre que localhost:5173,
    // je vais utiliser une variable ou hardcoder pour le dev.
    const frontendUrl = 'http://localhost:5173' // Idéalement dans .env
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`

    await mail.send(new VerifyEmailNotification(user, verifyUrl))

    return response.created({
      message: 'Compte créé avec succès. Veuillez vérifier vos emails pour activer votre compte.',
    })
  }

  async verifyEmail({ request, response }: HttpContext) {
    const token = request.input('token')

    if (!token) {
      return response.badRequest({ message: 'Token manquant' })
    }

    const user = await User.findBy('verificationToken', token)

    if (!user) {
      return response.badRequest({ message: 'Token invalide' })
    }

    user.isVerified = true
    user.verificationToken = null
    await user.save()

    return response.ok({ message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' })
  }

  async login({ request, response }: HttpContext) {
    const payload = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(payload.email, payload.password)

    if (!user.isVerified) {
      return response.unauthorized({ message: 'Veuillez vérifier votre email avant de vous connecter.' })
    }

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
        password: vine.string().minLength(8).maxLength(255).optional(),
        currentPassword: vine.string().optional(),
      })
    )

    const payload = await request.validateUsing(validator)

    if (payload.password) {
      if (!payload.currentPassword) {
        return response.badRequest({
          message: 'Le mot de passe actuel est requis pour définir un nouveau mot de passe.',
        })
      }
      const isValid = await hash.verify(user.password, payload.currentPassword)
      if (!isValid) {
        return response.badRequest({ message: 'Le mot de passe actuel est incorrect.' })
      }
    }

    const { currentPassword, ...dataToUpdate } = payload

    user.merge(dataToUpdate)
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

  async delete({ auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    await user.delete()

    return response.ok({
      message: 'User deleted successfully',
    })
  }
}
