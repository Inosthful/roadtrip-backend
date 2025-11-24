import Trip from '#models/trip'
import TripParticipant from '#models/trip_participant'
import { createTripValidator } from '#validators/trip/create'
import { updateTripValidator } from '#validators/trip/update'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class TripsController {
  /**
   * GET /trips
   * Liste tous les trips de l'utilisateur connecté (créés ou participations)
   */
  async index({ auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Récupère les trips créés + trips où il participe
    const createdTrips = await user.related('createdTrips').query()
    const participatingTrips = await user.related('participatingTrips').query()

    return response.ok({
      createdTrips,
      participatingTrips,
    })
  }

  /**
   * POST /trips
   * Crée un nouveau trip
   */
  async store({ auth, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(createTripValidator)

    // Créer le trip
    const trip = await Trip.create({
      title: payload.title,
      description: payload.description,
      startDate: DateTime.fromJSDate(payload.startDate),
      endDate: DateTime.fromJSDate(payload.endDate),
      budget: payload.budget || 0,
      status: payload.status || 'planning',
      creatorId: user.id,
    })
    // Ajouter automatiquement le créateur comme participant
    await TripParticipant.create({
      tripId: trip.id,
      userId: user.id,
      role: 'creator',
      invitationStatus: 'accepted',
      joinedAt: DateTime.now(),
    })

    return response.created(trip)
  }

  /**
   * GET /trips/:id
   * Récupère un trip avec ses relations
   */
  async show({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    const trip = await Trip.query()
      .where('id', params.id)
      .preload('creator')
      .preload('participants')
      .preload('stops', (query) => {
        query.orderBy('order', 'asc')
      })
      .firstOrFail()

    // Vérifier que l'user a accès (créateur ou participant)
    const isCreator = trip.creatorId === user.id
    const isParticipant = trip.participants.some((p) => p.id === user.id)

    if (!isCreator && !isParticipant) {
      return response.forbidden({ message: 'Access denied' })
    }

    return response.ok(trip)
  }

  /**
   * PATCH /trips/:id
   * Met à jour un trip
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(updateTripValidator)

    const trip = await Trip.findOrFail(params.id)

    // Vérifier que l'user est créateur ou admin
    const participation = await TripParticipant.query()
      .where('trip_id', trip.id)
      .where('user_id', user.id)
      .whereIn('role', ['creator', 'admin'])
      .first()

    if (!participation) {
      return response.forbidden({ message: 'Only creator or admin can update trip' })
    }

    // Convertir les dates si présentes
    const updateData = {
      ...payload,
      startDate: payload.startDate ? DateTime.fromJSDate(payload.startDate) : undefined,
      endDate: payload.endDate ? DateTime.fromJSDate(payload.endDate) : undefined,
    }

    trip.merge(updateData)
    await trip.save()

    return response.ok(trip)
  }

  /**
   * DELETE /trips/:id
   * Supprime un trip
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    const trip = await Trip.findOrFail(params.id)

    // Seul le créateur peut supprimer
    if (trip.creatorId !== user.id) {
      return response.forbidden({ message: 'Only creator can delete trip' })
    }

    await trip.delete()

    return response.noContent()
  }
}
