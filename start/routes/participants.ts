import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ParticipantsController = () => import('#controllers/participants_controller')

// Routes pour gérer les participants d'un trip
router
  .group(() => {
    // Inviter un participant à un trip
    router.post('/trips/:tripId/participants', [ParticipantsController, 'invite'])

    // Lister tous les participants d'un trip
    router.get('/trips/:tripId/participants', [ParticipantsController, 'index'])

    // Changer le rôle d'un participant
    router.patch('/trips/:tripId/participants/:userId', [ParticipantsController, 'updateRole'])

    // Retirer un participant d'un trip (ou se retirer soi-même)
    router.delete('/trips/:tripId/participants/:userId', [ParticipantsController, 'remove'])
  })
  .use(middleware.auth())

// Routes pour gérer les invitations
router
  .group(() => {
    // Lister mes invitations en attente
    router.get('/invitations', [ParticipantsController, 'myInvitations'])

    // Accepter une invitation
    router.post('/invitations/:participantId/accept', [ParticipantsController, 'accept'])

    // Refuser une invitation
    router.post('/invitations/:participantId/decline', [ParticipantsController, 'decline'])

    // Vérifier si un utilisateur existe par email
    router.post('/participants/check', [ParticipantsController, 'checkUser'])
  })
  .use(middleware.auth())
