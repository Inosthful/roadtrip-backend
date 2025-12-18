import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'

export default class ChangeEmailNotification extends BaseMail {
  from = 'no-reply@roadtrip-collab.com'
  subject = 'Confirmez votre nouvelle adresse email - RoadTrip Collab'

  constructor(private user: User, private verifyUrl: string) {
    super()
  }

  prepare() {
    this.message
      .to(this.user.pendingEmail!)
      .html(`
        <h1>Bonjour ${this.user.fullName},</h1>
        <p>Vous avez demandé à changer votre adresse email pour celle-ci.</p>
        <p>Pour confirmer ce changement, veuillez cliquer sur le lien ci-dessous (valide pendant 1 heure) :</p>
        <a href="${this.verifyUrl}">Confirmer mon nouvel email</a>
        <p>Si vous n'êtes pas à l'origine de cette demande, ne faites rien. Votre ancienne adresse email restera active.</p>
      `)
  }
}