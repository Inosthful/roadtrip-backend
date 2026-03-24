import Trip from '#models/trip'
import TripParticipant from '#models/trip_participant'
import Stop from '#models/stop'
import Expense from '#models/expense'
import ExpenseSplit from '#models/expense_split'
import { createTripValidator } from '#validators/trip/create'
import { updateTripValidator } from '#validators/trip/update'
import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { ItineraryOptimizer } from '#services/itinerary_optimizer'
import { formatFileName } from '#helpers/file_naming'
import drive from '@adonisjs/drive/services/main'
import AdmZip from 'adm-zip'
import TripStatusService from '#services/trip_status_service'

export default class TripsController {
  /**
   * GET /trips
   * Liste tous les trips de l'utilisateur connecté (créés ou participations)
   */
  async index({ auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()

    // Mise à jour automatique des statuts avant de lister
    const statusService = new TripStatusService()
    await statusService.handleStatusUpdates()

    // Récupère les trips créés + trips où il participe
    const createdTrips = await user.related('createdTrips').query()
      .preload('participants')
      .preload('expenses')
      .preload('creator')
      .orderBy('endDate', 'desc')

    // Récupère les voyages participés mais pas créés par l'utilisateur
    const participatingTrips = await user
      .related('participatingTrips')
      .query()
      .where('creator_id', '!=', user.id)
      .preload('participants')
      .preload('expenses')
      .preload('creator')
      .orderBy('endDate', 'desc')

    const formattedParticipatingTrips = participatingTrips.map((trip) => {
      const serialized = trip.serialize()
      if (trip.$extras) {
        serialized.invitationStatus = trip.$extras.pivot_invitation_status
      }
      return serialized
    })

    return response.ok({
      createdTrips,
      participatingTrips: formattedParticipatingTrips,
    })
  }

  /**
   * POST /trips
   * Crée un nouveau trip
   */
  async store({ auth, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(createTripValidator)

    const startDate = DateTime.fromJSDate(payload.startDate)
    // On enlève les heures/minutes pour comparer juste la date
    if (startDate < DateTime.now().startOf('day')) {
      return response.badRequest({
        message: 'La date de début ne peut pas être dans le passé',
      })
    }

    let coverImage: string | null = null
    if (payload.cover_image) {
      const fileName = formatFileName(payload.cover_image.clientName, payload.cover_image.extname ?? '')
      await payload.cover_image.moveToDisk(`trips/${fileName}`)
      coverImage = `trips/${fileName}`
    }

    // Créer le trip
    const trip = await Trip.create({
      title: payload.title,
      description: payload.description,
      startDate: DateTime.fromJSDate(payload.startDate),
      endDate: DateTime.fromJSDate(payload.endDate),
      budget: payload.budget || 0,
      status: payload.status || 'planning',
      category: (payload as any).category || null,
      carConsumption: payload.carConsumption || 7.0,
      fuelPrice: payload.fuelPrice || 1.8,
      settings: payload.settings,
      creatorId: user.id,
      coverImage: coverImage,
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
      .preload('expenses', (query) => {
        query.preload('payer').preload('splits').orderBy('expenseDate', 'desc')
      })
      .firstOrFail()

    // Vérifier que l'user a accès (créateur ou participant) ou si le trip est public
    const isCreator = trip.creatorId === user.id
    const isParticipant = trip.participants.some((p) => p.id === user.id)

    if (!isCreator && !isParticipant && !trip.isPublic) {
      return response.forbidden({ message: 'Access denied' })
    }

    const tripJson = trip.serialize()
    tripJson.participants = trip.participants.map((p) => {
      const pJson = p.serialize()
      if (p.$extras) {
        pJson.pivot = {
          id: p.$extras.pivot_id,
          role: p.$extras.pivot_role,
          invitationStatus: p.$extras.pivot_invitation_status,
          invitedAt: p.$extras.pivot_invited_at,
          joinedAt: p.$extras.pivot_joined_at,
        }
      }
      return pJson
    })

    return response.ok(tripJson)
  }

  /**
   * PATCH /trips/:id
   * Met à jour un trip
   */
  async update({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const payload = await request.validateUsing(updateTripValidator)

    const trip = await Trip.findOrFail(params.id)

    // Vérifier que l'user est créateur ou organizer
    const participation = await TripParticipant.query()
      .where('trip_id', trip.id)
      .where('user_id', user.id)
      .whereIn('role', ['creator', 'organizer'])
      .first()

    if (!participation) {
      return response.forbidden({ message: 'Only creator or organizer can update trip' })
    }

    // Vérifier que le voyage est encore en phase de planification
    if (trip.status !== 'planning') {
      return response.badRequest({
        message: 'Le voyage ne peut être modifié que lorsqu\'il est en statut "En planification"',
      })
    }

    // Convertir les données
    const updateData: any = {
      ...payload,
    }

    if (payload.cover_image) {
      if (trip.coverImage) {
        await drive.use().delete(trip.coverImage)
      }
      const fileName = formatFileName(payload.cover_image.clientName, payload.cover_image.extname ?? '')
      await payload.cover_image.moveToDisk(`trips/${fileName}`)
      updateData.coverImage = `trips/${fileName}`
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

    if (trip.coverImage) {
      await drive.use().delete(trip.coverImage)
    }

    await trip.delete()

    return response.noContent()
  }

  /**
   * POST /trips/:id/optimize
   * Optimise l'itinéraire du trip en minimisant la distance totale
   */
  async optimize({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const tripId = params.id

    // Vérifier que l'user a accès au trip
    await Trip.findOrFail(tripId)

    const participation = await TripParticipant.query()
      .where('trip_id', tripId)
      .where('user_id', user.id)
      .where('invitation_status', 'accepted')
      .first()

    if (!participation) {
      return response.forbidden({
        message: 'You must be a participant to optimize this trip',
      })
    }

    // Récupérer tous les stops du trip (triés par ordre actuel)
    const stops = await Stop.query().where('trip_id', tripId).orderBy('order', 'asc')

    if (stops.length < 2) {
      return response.badRequest({
        message: 'Trip must have at least 2 stops to optimize',
      })
    }

    // Calculer la distance avant optimisation
    const optimizer = new ItineraryOptimizer()
    const distanceBefore = optimizer.calculateTotalDistance(stops)

    // Optimiser l'itinéraire
    const optimizedStops = optimizer.optimize(stops)

    // Calculer la distance après optimisation
    const distanceAfter = optimizer.calculateTotalDistance(optimizedStops)

    // Mettre à jour les "order" en base de données
    for (const [i, optimizedStop] of optimizedStops.entries()) {
      optimizedStop.order = i + 1
      await optimizedStop.save()
    }

    return response.ok({
      message: 'Itinerary optimized successfully',
      data: {
        stops: optimizedStops,
        optimization: {
          distance_before_km: distanceBefore,
          distance_after_km: distanceAfter,
          distance_saved_km: Math.round((distanceBefore - distanceAfter) * 10) / 10,
          improvement_percent:
            Math.round(((distanceBefore - distanceAfter) / distanceBefore) * 1000) / 10,
        },
      },
    })
  }

  /**
   * GET /trips/finished
   * Récupère les trips terminés ET publics
   */
  async finished({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 6)
    const category = request.input('category')

    const query = Trip.query()
      .where('is_public', true)

    if (category && category !== 'Tout') {
      query.where('category', category)
    }

    const finishedTrips = await query
      .orderBy('endDate', 'desc')
      .preload('creator')
      .preload('participants')
      .preload('expenses')
      .preload('stops', (q) => {
        q.where('type', 'city').orderBy('order', 'asc')
      })
      .paginate(page, limit)

    return response.ok(finishedTrips)
  }

  /**
   * POST /trips/:id/public
   * Rendre un voyage public avec une catégorie
   */
  async makePublic({ auth, params, request, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const trip = await Trip.findOrFail(params.id)

    if (trip.creatorId !== user.id) {
      return response.forbidden({ message: 'Seul le créateur peut rendre ce voyage public.' })
    }

    if (trip.status !== 'completed') {
      return response.badRequest({ message: 'Seul un voyage terminé peut être rendu public.' })
    }

    const category = request.input('category')
    if (!category) {
      return response.badRequest({ message: 'Une catégorie est requise.' })
    }

    trip.isPublic = true
    trip.category = category
    await trip.save()

    return response.ok(trip)
  }

  /**
   * POST /trips/:id/duplicate
   * Duplique un voyage (le sien ou un public)
   * Si public, anonymise les dépenses
   */
  async duplicate({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const tripId = params.id

    // Récupérer le voyage original avec ses stops et dépenses
    const originalTrip = await Trip.query()
      .where('id', tripId)
      .preload('stops')
      .preload('expenses')
      .preload('participants')
      .firstOrFail()

    const isOwner = originalTrip.creatorId === user.id
    const isParticipant = originalTrip.participants.some(p => p.id === user.id)
    if (!isOwner && !isParticipant && !originalTrip.isPublic) {
      return response.forbidden({ message: 'Vous ne pouvez pas dupliquer ce voyage.' })
    }

    // Créer le nouveau voyage
    const newTrip = await Trip.create({
      title: `${originalTrip.title} (Copie)`,
      description: originalTrip.description,
      startDate: DateTime.now(),
      endDate: DateTime.now().plus({ days: originalTrip.endDate.diff(originalTrip.startDate, 'days').days }),
      budget: originalTrip.budget,
      status: 'planning',
      isPublic: false,
      category: originalTrip.category,
      carConsumption: originalTrip.carConsumption,
      fuelPrice: originalTrip.fuelPrice,
      tollRate: originalTrip.tollRate,
      creatorId: user.id,
      coverImage: originalTrip.coverImage, // On copie l'image de couverture
    })

    // Ajouter le créateur comme participant
    await TripParticipant.create({
      tripId: newTrip.id,
      userId: user.id,
      role: 'creator',
      invitationStatus: 'accepted',
      joinedAt: DateTime.now(),
    })

    // Dupliquer les stops
    const stopIdMap = new Map<number, number>()
    if (originalTrip.stops && originalTrip.stops.length > 0) {
      for (const stop of originalTrip.stops) {
        const newStop = await Stop.create({
          tripId: newTrip.id,
          title: stop.title,
          description: stop.description,
          type: stop.type,
          latitude: stop.latitude,
          longitude: stop.longitude,
          address: stop.address,
          order: stop.order,
          isLocked: stop.isLocked,
          arrivalDate: DateTime.now().plus({ days: stop.arrivalDate?.diff(originalTrip.startDate, 'days').days || 0 }),
          departureDate: DateTime.now().plus({ days: stop.departureDate?.diff(originalTrip.startDate, 'days').days || 0 }),
          createdBy: user.id,
        })
        stopIdMap.set(stop.id, newStop.id)
      }
    }

    if (originalTrip.expenses && originalTrip.expenses.length > 0) {
      for (const exp of originalTrip.expenses) {
        const newExp = await Expense.create({
          tripId: newTrip.id,
          stopId: exp.stopId ? stopIdMap.get(exp.stopId) || null : null,
          title: exp.title,
          description: exp.description,
          amount: exp.amount,
          category: exp.category,
          paidBy: user.id, // Toujours payé par le nouveau créateur (anonymisation)
          expenseDate: DateTime.now().plus({ days: exp.expenseDate.diff(originalTrip.startDate, 'days').days || 0 }),
        })

        await ExpenseSplit.create({
          expenseId: newExp.id,
          userId: user.id,
          amount: exp.amount,
          isPaid: true,
        })
      }
    }

    return response.created(newTrip)
  }

  /**
   * GET /trips/:id/photos/download
   */
  async downloadPhotos({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const tripId = params.id
    const trip = await Trip.query().where('id', tripId).preload('stops', (q) => {
        q.preload('photos').orderBy('arrivalDate', 'asc').orderBy('order', 'asc')
      }).firstOrFail()
    const participation = await TripParticipant.query().where('trip_id', tripId).where('user_id', user.id).where('invitation_status', 'accepted').first()
    if (!participation) return response.forbidden({ message: 'Access denied' })
    if (trip.status !== 'completed') return response.badRequest({ message: 'Seul les voyages terminés.' })
    const zip = new AdmZip()
    const tripStartDate = trip.startDate
    const stopsByDay: Map<number, Stop[]> = new Map()
    for (const stop of trip.stops) {
      let dayNum = 1
      if (stop.arrivalDate) {
        const diff = stop.arrivalDate.diff(tripStartDate, 'days').toObject()
        dayNum = Math.floor(diff.days || 0) + 1
      }
      if (dayNum < 1) dayNum = 1
      if (!stopsByDay.has(dayNum)) stopsByDay.set(dayNum, [])
      stopsByDay.get(dayNum)!.push(stop)
    }
    const sortedDays = Array.from(stopsByDay.keys()).sort((a, b) => a - b)
    for (const dayNum of sortedDays) {
      const dayStops = stopsByDay.get(dayNum)!
      if (dayStops.length === 0) continue
      const firstStop = dayStops[0]
      const cleanLocation = (firstStop.title || 'Inconnu').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
      const dayFolderName = `jour-${dayNum}-${cleanLocation}`
      for (const stop of dayStops) {
        if (!stop.photos || stop.photos.length === 0) continue
        const cleanStopName = stop.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)
        const stopFolderName = `${dayFolderName}/${cleanStopName}`
        for (const photo of stop.photos) {
          try {
            const content = await drive.use().getBytes(photo.filePath)
            const fileName = photo.filePath.split('/').pop() || `photo-${photo.id}.jpg`
            zip.addFile(`${stopFolderName}/${fileName}`, Buffer.from(content))
          } catch (error) {}
        }
      }
    }
    const zipBuffer = zip.toBuffer()
    const zipName = `Trip-${trip.title.replace(/[^a-z0-9]/gi, '_')}-Photos.zip`
    response.header('Content-Type', 'application/zip')
    response.header('Content-Disposition', `attachment; filename="${zipName}"`)
    return response.send(zipBuffer)
  }
}
