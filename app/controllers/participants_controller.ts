import Trip from '#models/trip'
import TripParticipant from '#models/trip_participant'
import User from '#models/user'
import { inviteParticipantValidator } from '#validators/participant/invite'
import { updateRoleValidator } from '#validators/participant/update_role'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import mail from '@adonisjs/mail/services/main'

export default class ParticipantsController {
  /**
   * Méthode helper privée : Vérifie que l'utilisateur a accès au trip
   * Retourne le trip et le participant si l'accès est autorisé
   */
  private async checkTripAccess(tripId: number, userId: number, response: HttpContext['response']) {
    const trip = await Trip.findOrFail(tripId)

    const participant = await TripParticipant.query()
      .where('trip_id', trip.id)
      .where('user_id', userId)
      .first()

    if (!participant) {
      response.forbidden({ message: 'Access denied: You are not a participant of this trip' })
      return null
    }

    return { trip, participant }
  }

  /**
   * POST /trips/:tripId/participants
   * Invite un utilisateur à rejoindre le trip
   */
  async invite({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(inviteParticipantValidator)

    // Vérifier que l'utilisateur a accès au trip et est creator/organizer
    const access = await this.checkTripAccess(params.tripId, user.id, response)
    if (!access) return

    const { trip, participant } = access

    // Seuls creator et organizer peuvent inviter
    if (participant.role !== 'creator' && participant.role !== 'organizer') {
      return response.forbidden({ message: 'Only creator or organizer can invite participants' })
    }

    // Trouver l'utilisateur à inviter par son email
    const userToInvite = await User.query().where('email', payload.email).first()

    if (!userToInvite) {
      return response.notFound({ message: 'User not found with this email' })
    }

    // Vérifier qu'il n'est pas déjà participant
    const existingParticipant = await TripParticipant.query()
      .where('trip_id', trip.id)
      .where('user_id', userToInvite.id)
      .first()

    if (existingParticipant) {
      return response.conflict({
        message: 'User is already a participant or has a pending invitation',
      })
    }

    // Créer l'invitation
    const invitation = await TripParticipant.create({
      tripId: trip.id,
      userId: userToInvite.id,
      role: 'member',
      invitationStatus: 'pending',
      invitedAt: DateTime.now(),
    })

    // Envoyer l'email d'invitation
    const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitations/${invitation.id}/accept`

    await mail.send((message) => {
      message.to(userToInvite.email).subject(`Invitation au voyage : ${trip.title}`).html(`
          <h1>Invitation au voyage</h1>
          <p>Bonjour ${userToInvite.fullName},</p>
          <p><strong>${user.fullName}</strong> vous invite à rejoindre le voyage <strong>${trip.title}</strong> sur RoadTrip Collab !</p>
          <p>Dates : ${trip.startDate.toFormat('dd/MM/yyyy')} - ${trip.endDate.toFormat('dd/MM/yyyy')}</p>
          <p>Pour accepter l'invitation, cliquez sur le lien ci-dessous :</p>
          <a href="${acceptUrl}" style="padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 5px;">Accepter l'invitation</a>
        `)
    })

    return response.created({
      message: 'Invitation sent successfully',
      invitation,
    })
  }

  /**
   * GET /trips/:tripId/participants
   * Liste tous les participants d'un trip
   */
  async index({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Vérifier que l'utilisateur a accès au trip
    const access = await this.checkTripAccess(params.tripId, user.id, response)
    if (!access) return

    const { trip } = access

    // Récupérer tous les participants avec leurs infos utilisateur
    const participants = await TripParticipant.query()
      .where('trip_id', trip.id)
      .preload('user', (query) => {
        query.select('id', 'fullName', 'email')
      })
      .orderBy('created_at', 'asc')

    return response.ok({
      tripId: trip.id,
      tripTitle: trip.title,
      participants,
    })
  }

  /**
   * GET /invitations
   * Liste toutes les invitations en attente de l'utilisateur connecté
   */
  async myInvitations({ auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Récupérer toutes les invitations pending de cet utilisateur
    const invitations = await TripParticipant.query()
      .where('user_id', user.id)
      .where('invitation_status', 'pending')
      .preload('trip', (query) => {
        query
          .select('id', 'title', 'description', 'startDate', 'endDate', 'creatorId')
          .preload('creator')
      })
      .orderBy('invited_at', 'desc')

    return response.ok({
      invitations,
    })
  }

  /**
   * POST /invitations/:participantId/accept
   * Accepte une invitation
   */
  async accept({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Trouver l'invitation
    const participant = await TripParticipant.findOrFail(params.participantId)

    // Vérifier que c'est bien l'utilisateur invité qui accepte
    if (participant.userId !== user.id) {
      return response.forbidden({ message: 'You can only accept your own invitations' })
    }

    // Vérifier que l'invitation est bien en attente
    if (participant.invitationStatus !== 'pending') {
      return response.forbidden({ message: 'Invitation already answered or invalid' })
    }

    // Accepter l'invitation
    participant.invitationStatus = 'accepted'
    participant.joinedAt = DateTime.now()
    await participant.save()

    return response.ok({
      message: 'Invitation accepted successfully',
      participant,
    })
  }

  /**
   * POST /invitations/:participantId/decline
   * Refuse une invitation
   */
  async decline({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Trouver l'invitation
    const participant = await TripParticipant.findOrFail(params.participantId)

    // Vérifier que c'est bien l'utilisateur invité qui répond
    if (participant.userId !== user.id) {
      return response.forbidden({ message: 'You can only accept your own invitations' })
    }

    // Vérifier que l'invitation est bien en attente
    if (participant.invitationStatus !== 'pending') {
      return response.forbidden({ message: 'Invitation already answered or invalid' })
    }

    // Refuser l'invitation
    participant.invitationStatus = 'declined'
    await participant.save()

    return response.ok({
      message: 'Invitation declined successfully',
      participant,
    })
  }

  /**
   * PATCH /trips/:tripId/participants/:userId
   * Change le rôle d'un participant
   */
  async updateRole({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(updateRoleValidator)

    // Vérifier que l'utilisateur a accès au trip
    const access = await this.checkTripAccess(params.tripId, user.id, response)
    if (!access) return

    const { trip, participant: currentUserParticipant } = access

    // Seul le creator peut changer les rôles
    if (currentUserParticipant.role !== 'creator') {
      return response.forbidden({ message: 'Only the creator can change participant roles' })
    }

    // Trouver le participant à modifier
    const targetParticipant = await TripParticipant.query()
      .where('trip_id', trip.id)
      .where('user_id', params.userId)
      .firstOrFail()

    // On ne peut pas changer le rôle du creator
    if (targetParticipant.role === 'creator') {
      return response.forbidden({ message: 'Cannot change the role of the trip creator' })
    }

    // Mettre à jour le rôle
    targetParticipant.role = payload.role
    await targetParticipant.save()

    return response.ok({
      message: 'Role updated successfully',
      participant: targetParticipant,
    })
  }

  /**
   * DELETE /trips/:tripId/participants/:userId
   * Retire un participant du trip (ou permet de se retirer soi-même)
   */
  async remove({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Vérifier que l'utilisateur a accès au trip
    const access = await this.checkTripAccess(params.tripId, user.id, response)
    if (!access) return

    const { trip, participant: currentUserParticipant } = access

    // Trouver le participant à retirer
    const targetParticipant = await TripParticipant.query()
      .where('trip_id', trip.id)
      .where('user_id', params.userId)
      .firstOrFail()

    // Logique conditionnelle : 2 cas possibles
    const isSelfRemoval = user.id === Number(params.userId)

    if (isSelfRemoval) {
      // CAS 1 : L'utilisateur veut se retirer lui-même (quitter le trip)
      if (currentUserParticipant.role === 'creator') {
        return response.forbidden({
          message: 'The creator cannot leave their own trip',
        })
      }
      // OK, il peut se retirer
    } else {
      // CAS 2 : L'utilisateur veut retirer quelqu'un d'autre
      if (currentUserParticipant.role !== 'creator') {
        return response.forbidden({
          message: 'Only the creator can remove other participants',
        })
      }

      // On ne peut pas retirer le creator
      if (targetParticipant.role === 'creator') {
        return response.forbidden({
          message: 'Cannot remove the trip creator',
        })
      }
    }

    // Supprimer le participant
    await targetParticipant.delete()

    return response.ok({
      message: isSelfRemoval ? 'You have left the trip' : 'Participant removed successfully',
    })
  }

  /**
   * POST /participants/check
   * Vérifie si un utilisateur existe par email
   */
  async checkUser({ request, response }: HttpContext) {
    const email = request.input('email')

    if (!email) {
      return response.badRequest({ message: 'Email is required' })
    }

    const user = await User.findBy('email', email)

    if (!user) {
      return response.notFound({ message: 'Aucun utilisateur trouvé avec cet email' })
    }

    return response.ok({
      exists: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email
      }
    })
  }
}
