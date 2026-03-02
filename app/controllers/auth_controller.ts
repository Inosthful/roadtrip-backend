import User from '#models/user'
import OtpToken from '#models/otp_token'
import { loginValidator } from '#validators/auth/login'
import { registerValidator } from '#validators/auth/register'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import VerifyEmailNotification from '#mails/verify_email_notification'
import ResetPasswordNotification from '#mails/reset_password_notification'
import ChangeEmailNotification from '#mails/change_email_notification'
import mail from '@adonisjs/mail/services/main'
import crypto from 'node:crypto'
import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const payload = await request.validateUsing(registerValidator)

    const user = await User.create({
      ...payload,
      isVerified: false,
    })

    const token = crypto.randomBytes(32).toString('hex')

    await OtpToken.create({
      userId: user.id,
      tokenHash: token,
      purpose: 'verify_email',
      expiresAt: DateTime.now().plus({ hours: 24 }), // Token valide 24h
    })

    const frontendUrl = 'http://localhost:5173'
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`

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

    const otpToken = await OtpToken.query()
      .where('token_hash', token)
      .where('purpose', 'verify_email')
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .first()

    if (!otpToken) {
      return response.badRequest({ message: 'Lien invalide ou expiré.' })
    }

    const user = otpToken.user
    user.isVerified = true
    await user.save()

    otpToken.usedAt = DateTime.now()
    await otpToken.save()

    return response.ok({ message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' })
  }

  async forgotPassword({ request, response }: HttpContext) {
    const { email } = await request.validateUsing(
      vine.compile(
        vine.object({
          email: vine.string().email(),
        })
      )
    )

    const user = await User.findBy('email', email)

    if (!user) {
      return response.notFound({ message: "Aucun compte n'est associé à cet email." })
    }

    const token = crypto.randomBytes(32).toString('hex')

    await OtpToken.create({
      userId: user.id,
      tokenHash: token,
      purpose: 'reset_password',
      expiresAt: DateTime.now().plus({ hours: 1 }),
    })

    const frontendUrl = 'http://localhost:5173'
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`

    await mail.send(new ResetPasswordNotification(user, resetUrl))

    return response.ok({ message: 'Un email de réinitialisation vous a été envoyé.' })
  }

  async resetPassword({ request, response }: HttpContext) {
    const { token, password } = await request.validateUsing(
      vine.compile(
        vine.object({
          token: vine.string(),
          password: vine.string().minLength(8),
        })
      )
    )

    const otpToken = await OtpToken.query()
      .where('token_hash', token)
      .where('purpose', 'reset_password')
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .first()

    if (!otpToken) {
      return response.badRequest({ message: 'Lien invalide ou expiré.' })
    }

    const user = otpToken.user
    user.password = password
    await user.save()

    otpToken.usedAt = DateTime.now()
    await otpToken.save()

    return response.ok({ message: 'Votre mot de passe a été réinitialisé avec succès.' })
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
          isVerified: user.isVerified,
          isAdmin: user.isAdmin,
        },
      },
    })
  }

  async update({ auth, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Validation
    const payload = await request.validateUsing(
      vine.compile(
        vine.object({
          fullName: vine.string().optional(),
          email: vine.string().email().normalizeEmail().optional(),
          password: vine.string().minLength(8).maxLength(255).optional(),
          currentPassword: vine.string().optional(),
        })
      )
    )

    let emailChangeMessage = null;

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
      user.password = payload.password
    }

    if (payload.fullName) {
      user.fullName = payload.fullName
    }

    // Gestion du changement d'email via OtpToken
    if (payload.email && payload.email !== user.email) {
      const existingUser = await User.findBy('email', payload.email)
      if (existingUser) {
        return response.badRequest({ message: 'Cet email est déjà utilisé par un autre compte.' })
      }

      const token = crypto.randomBytes(32).toString('hex')

      // On stocke le nouvel email dans la colonne 'data' du token
      await OtpToken.create({
        userId: user.id,
        tokenHash: token,
        purpose: 'change_email',
        data: { newEmail: payload.email },
        expiresAt: DateTime.now().plus({ hours: 1 }),
      })
      
      // On attache temporairement pendingEmail à l'objet user pour l'envoi du mail, 
      // même si ce n'est plus dans la DB user
      user.pendingEmail = payload.email 
      
      const frontendUrl = 'http://localhost:5173'
      const verifyUrl = `${frontendUrl}/verify-change-email?token=${token}`

      await mail.send(new ChangeEmailNotification(user, verifyUrl))
      
      emailChangeMessage = `Un email de vérification a été envoyé à ${payload.email}.`
    }

    await user.save()

    // Pour la réponse, on peut vérifier s'il y a un token actif 'change_email' pour ce user
    const activeChangeEmailToken = await OtpToken.query()
       .where('user_id', user.id)
       .where('purpose', 'change_email')
       .whereNull('used_at')
       .where('expires_at', '>', DateTime.now().toSQL())
       .orderBy('created_at', 'desc')
       .first()

    return response.ok({
      message: emailChangeMessage || 'Profil mis à jour avec succès.',
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          pendingEmail: activeChangeEmailToken ? activeChangeEmailToken.data?.newEmail : null
        },
      },
    })
  }

  async verifyChangeEmail({ request, response }: HttpContext) {
    const token = request.input('token')

    if (!token) {
      return response.badRequest({ message: 'Token manquant' })
    }

    const otpToken = await OtpToken.query()
      .where('token_hash', token)
      .where('purpose', 'change_email')
      .whereNull('used_at')
      .where('expires_at', '>', DateTime.now().toSQL())
      .preload('user')
      .first()

    if (!otpToken) {
      return response.badRequest({ message: 'Lien invalide ou expiré.' })
    }

    const user = otpToken.user
    const newEmail = otpToken.data?.newEmail

    if (!newEmail) {
       return response.badRequest({ message: 'Données de changement d\'email corrompues.' })
    }

    user.email = newEmail
    await user.save()

    otpToken.usedAt = DateTime.now()
    await otpToken.save()

    return response.ok({ message: 'Votre adresse email a été mise à jour avec succès.' })
  }

  async delete({ auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    await user.delete()

    return response.ok({
      message: 'User deleted successfully',
    })
  }
}
