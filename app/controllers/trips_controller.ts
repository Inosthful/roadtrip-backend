import Trip from '#models/trip'
import TripParticipant from '#models/trip_participant'
import Stop from '#models/stop'
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

    // Vérifier que l'user a accès (créateur ou participant)
    const isCreator = trip.creatorId === user.id
    const isParticipant = trip.participants.some((p) => p.id === user.id)

    if (!isCreator && !isParticipant) {
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
   *
   * Algorithme :
   * - Utilise la formule de Haversine (distance à vol d'oiseau)
   * - Applique l'algorithme du plus proche voisin
   * - Respecte les contraintes (stops lockés gardent leur position)
   *
   * Permissions : Participant du trip (creator/organizer/member)
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
   * Récupère les trips terminés (date de fin passée)
   * Route publique
   */
  async finished({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 6)

    const finishedTrips = await Trip.query()
      .where('endDate', '<', DateTime.now().toSQLDate()!)
      .orderBy('endDate', 'desc')
      .preload('stops', (query) => {
        query.where('type', 'city').orderBy('order', 'asc')
      })
      .paginate(page, limit)

    return response.ok(finishedTrips)
  }

  /**
   * POST /trips/:id/duplicate
   * Duplique un voyage existant pour l'utilisateur connecté
   */
  async duplicate({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const tripId = params.id

    // Récupérer le voyage original avec ses stops
    const originalTrip = await Trip.query()
      .where('id', tripId)
      .preload('stops')
      .firstOrFail()

    // Créer le nouveau voyage
    const newTrip = await Trip.create({
      title: originalTrip.title,
      description: originalTrip.description,
      startDate: DateTime.now(),
      endDate: DateTime.now(),
      budget: originalTrip.budget,
      status: 'planning',
      carConsumption: originalTrip.carConsumption,
      fuelPrice: originalTrip.fuelPrice,
      tollRate: originalTrip.tollRate,
      creatorId: user.id,
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
    if (originalTrip.stops && originalTrip.stops.length > 0) {
      for (const stop of originalTrip.stops) {
        await Stop.create({
          tripId: newTrip.id,
          title: stop.title,
          description: stop.description,
          type: stop.type,
          latitude: stop.latitude,
          longitude: stop.longitude,
          address: stop.address,
          order: stop.order,
          isLocked: stop.isLocked,
          // On met les dates à aujourd'hui comme demandé
          arrivalDate: DateTime.now(),
          departureDate: DateTime.now(),
          createdBy: user.id,
        })
      }
    }

    return response.created(newTrip)
  }

  /**
   * GET /trips/:id/photos/download
   * Télécharge toutes les photos d'un trip terminé dans un ZIP organisé
   */
  async downloadPhotos({ auth, params, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const tripId = params.id

    // 1. Récupérer le trip avec les stops et les photos
    const trip = await Trip.query()
      .where('id', tripId)
      .preload('stops', (query) => {
        query.preload('photos').orderBy('arrivalDate', 'asc').orderBy('order', 'asc')
      })
      .firstOrFail()

    // 2. Vérifier l'accès
    const participation = await TripParticipant.query()
      .where('trip_id', tripId)
      .where('user_id', user.id)
      .where('invitation_status', 'accepted')
      .first()

    if (!participation) {
      return response.forbidden({ message: 'Access denied' })
    }

    // 3. Vérifier le statut (optionnel, mais demandé "pour les trips terminés")
    // On peut être souple et autoriser le téléchargement même si pas "completed" tant qu'il y a des photos,
    // mais la demande spécifie "pour les trips qui ont le status terminé".
    if (trip.status !== 'completed') {
       return response.badRequest({ message: 'Les photos ne peuvent être téléchargées que pour les voyages terminés.' })
    }

    const zip = new AdmZip()
    const tripStartDate = trip.startDate

    // Group stops by day
    // Key: Day Number (1-based)
    // Value: Array of Stops
    const stopsByDay: Map<number, Stop[]> = new Map()

    for (const stop of trip.stops) {
      let dayNum = 1
      if (stop.arrivalDate) {
        // Calculer la différence en jours
        const diff = stop.arrivalDate.diff(tripStartDate, 'days').toObject()
        // Math.floor pour gérer les heures, +1 car jour 1 = start date
        dayNum = Math.floor(diff.days || 0) + 1
      }

      // Si la date est antérieure au début (cas limite), on met jour 1
      if (dayNum < 1) dayNum = 1

      if (!stopsByDay.has(dayNum)) {
        stopsByDay.set(dayNum, [])
      }
      stopsByDay.get(dayNum)!.push(stop)
    }

    // Parcourir les jours triés
    const sortedDays = Array.from(stopsByDay.keys()).sort((a, b) => a - b)

    for (const dayNum of sortedDays) {
      const dayStops = stopsByDay.get(dayNum)!
      if (dayStops.length === 0) continue

      // Déterminer le nom du lieu du jour (basé sur le premier stop)
      // "jour-lenumerodujour-lelieudutripsdujour"
      const firstStop = dayStops[0]
      // Nettoyer le nom pour éviter les caractères invalides dans les chemins
      const cleanLocation = (firstStop.title || 'Inconnu').replace(/[^a-z0-9]/gi, '_').substring(0, 30)
      const dayFolderName = `jour-${dayNum}-${cleanLocation}`

      for (const stop of dayStops) {
        if (!stop.photos || stop.photos.length === 0) continue

        // "ensuite on aura un dossier pour chaque trips (stops) ... nom du lieu du trips"
        const cleanStopName = stop.title.replace(/[^a-z0-9]/gi, '_').substring(0, 30)
        const stopFolderName = `${dayFolderName}/${cleanStopName}`

        for (const photo of stop.photos) {
          try {
            // Récupérer le contenu du fichier depuis le Drive (local ou S3)
            // Note: getBytes retourne un Buffer
            const content = await drive.use().getBytes(photo.filePath)

            // Nom du fichier original ou généré
            const fileName = photo.filePath.split('/').pop() || `photo-${photo.id}.jpg`

            // Ajouter au zip
            zip.addFile(`${stopFolderName}/${fileName}`, Buffer.from(content))
          } catch (error) {
            console.error(`Erreur lors de l'ajout de la photo ${photo.id} au zip:`, error)
            // On continue même si une photo échoue
          }
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
