import Stop from '#models/stop'
import Trip from '#models/trip'
import { createStopValidator } from '#validators/stop/create'
import { updateStopValidator } from '#validators/stop/update'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'

export default class StopsController {
  /**
   * GET /trips/:tripId/stops
   * Liste toutes les étapes d'un voyage
   */
  async index({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Vérifier que l'user a accès au trip
    const trip = await Trip.findOrFail(params.tripId)
    const hasAccess = await this.checkTripAccess(trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied to this trip' })
    }

    // Récupérer toutes les étapes, triées par ordre
    const stops = await Stop.query()
      .where('trip_id', trip.id)
      .preload('creator')
      .orderBy('order', 'asc')

    return response.ok(stops)
  }

  /**
   * POST /trips/:tripId/stops
   * Créer une nouvelle étape
   */
  async store({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(createStopValidator)

    // Vérifier que l'user a accès au trip
    const trip = await Trip.findOrFail(params.tripId)
    const hasAccess = await this.checkTripAccess(trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied to this trip' })
    }

    // // Calculer l'ordre automatique si non fourni
    // let order = payload.order

    // if (!order) {
    //   // Chercher l'étape avec le plus grand ordre
    //   const lastStop = await Stop.query().where('trip_id', trip.id).orderBy('order', 'desc').first()

    //   // Si aucune étape n'existe, c'est la première
    //   if (lastStop === null) {
    //     order = 1
    //   } else {
    //     // Sinon, prendre l'ordre max + 1
    //     order = lastStop.order + 1
    //   }
    // }
    let order = payload.order

    if (!order) {
      const lastStop = await Stop.query().where('trip_id', trip.id).orderBy('order', 'desc').first()
      if (lastStop === null) {
        order = 1
      } else {
        order = lastStop.order + 1
      }
    }

    const stop = await Stop.create({
      tripId: trip.id,
      title: payload.title,
      description: payload.description,
      type: payload.type,
      latitude: payload.latitude,
      longitude: payload.longitude,
      address: payload.address,
      arrivalDate: payload.arrivalDate ? DateTime.fromJSDate(payload.arrivalDate) : null,
      departureDate: payload.departureDate ? DateTime.fromJSDate(payload.departureDate) : null,
      order: order,
      isLocked: payload.isLocked || false,
      createdBy: user.id,
    })

    await stop.load('creator')
    return response.created(stop)
  }

  /**
   * GET /stops/:id
   * Récupère une étape spécifique
   */
  async show({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    const stop = await Stop.query()
      .where('id', params.id)
      .preload('trip')
      .preload('creator')
      .preload('photos')
      .firstOrFail()

    // Vérifier l'accès au trip parent
    const hasAccess = await this.checkTripAccess(stop.trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied' })
    }

    return response.ok(stop)
  }

  /**
   * PATCH /stops/:id
   * Met à jour une étape
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(updateStopValidator)

    const stop = await Stop.query().where('id', params.id).preload('trip').firstOrFail()

    // Vérifier l'accès au trip parent
    const hasAccess = await this.checkTripAccess(stop.trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied' })
    }

    // Convertir les dates si présentes
    const updateData = {
      ...payload,
      arrivalDate: payload.arrivalDate ? DateTime.fromJSDate(payload.arrivalDate) : undefined,
      departureDate: payload.departureDate ? DateTime.fromJSDate(payload.departureDate) : undefined,
    }

    stop.merge(updateData)
    await stop.save()

    return response.ok(stop)
  }

  /**
   * DELETE /stops/:id
   * Supprime une étape
   */
  async destroy({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    const stop = await Stop.query().where('id', params.id).preload('trip').firstOrFail()

    // Vérifier l'accès au trip parent
    const hasAccess = await this.checkTripAccess(stop.trip, user.id)

    if (!hasAccess) {
      return response.forbidden({ message: 'Access denied' })
    }

    await stop.delete()

    return response.noContent()
  }

  /**
   * Méthode helper pour vérifier l'accès à un trip
   */
  private async checkTripAccess(trip: Trip, userId: number): Promise<boolean> {
    // Charger les participants si pas déjà chargés
    await trip.load('participants')

    const isCreator = trip.creatorId === userId
    const isParticipant = trip.participants.some((p) => p.id === userId)

    return isCreator || isParticipant
  }
}
