import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'

export default class ResetPasswordNotification extends BaseMail {
  from = 'no-reply@roadtrip-collab.com'
  subject = 'Réinitialisation de votre mot de passe - RoadTrip Collab'

  constructor(private user: User, private resetUrl: string) {
    super()
  }

  prepare() {
    this.message
      .to(this.user.email)
      .html(`
        <h1>Bonjour ${this.user.fullName},</h1>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien ci-dessous pour changer votre mot de passe (ce lien est valide pendant 1 heure) :</p>
        <a href="${this.resetUrl}">Réinitialiser mon mot de passe</a>
        <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.</p>
      `)
  }
}