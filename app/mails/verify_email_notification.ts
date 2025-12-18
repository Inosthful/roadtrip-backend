import { BaseMail } from '@adonisjs/mail'
import User from '#models/user'

export default class VerifyEmailNotification extends BaseMail {
  from = 'no-reply@roadtrip-collab.com'
  subject = 'Vérifiez votre adresse email - RoadTrip Collab'

  constructor(private user: User, private verifyUrl: string) {
    super()
  }

  /**
   * The "prepare" method is called automatically when
   * the email is sent or queued.
   */
  prepare() {
    this.message
      .to(this.user.email)
      .html(`
        <h1>Bienvenue ${this.user.fullName} !</h1>
        <p>Merci de vous être inscrit sur RoadTrip Collab.</p>
        <p>Pour activer votre compte, veuillez cliquer sur le lien ci-dessous :</p>
        <a href="${this.verifyUrl}">Vérifier mon email</a>
        <p>Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
      `)
  }
}