import User from '#models/user'
import Trip from '#models/trip'
import Stop from '#models/stop'
import Photo from '#models/photo'
import type { HttpContext } from '@adonisjs/core/http'
import drive from '@adonisjs/drive/services/main'
import db from '@adonisjs/lucid/services/db'

export default class AdminController {
  /**
   * GET /admin/stats
   * Statistiques globales de la plateforme
   */
  async stats({ response }: HttpContext) {
    const [totalUsers, totalTrips, totalStops, totalPhotos] = await Promise.all([
      User.query().count('* as total').first(),
      Trip.query().count('* as total').first(),
      Stop.query().count('* as total').first(),
      Photo.query().count('* as total').first(),
    ])

    const expenseResult = await db
      .from('expenses')
      .sum('amount as totalAmount')
      .count('* as totalExpenses')
      .first()

    return response.ok({
      totalUsers: Number(totalUsers?.$extras.total ?? 0),
      totalTrips: Number(totalTrips?.$extras.total ?? 0),
      totalStops: Number(totalStops?.$extras.total ?? 0),
      totalPhotos: Number(totalPhotos?.$extras.total ?? 0),
      totalExpenses: Number(expenseResult?.totalExpenses ?? 0),
      totalExpenseAmount: Number(expenseResult?.totalAmount ?? 0),
    })
  }

  /**
   * GET /admin/users
   * Liste paginée de tous les utilisateurs
   */
  async indexUsers({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const search = request.input('search', '')

    const query = User.query()
      .select('id', 'full_name', 'email', 'is_verified', 'is_admin', 'created_at')
      .orderBy('created_at', 'desc')

    if (search) {
      query.where((builder) => {
        builder.whereILike('full_name', `%${search}%`).orWhereILike('email', `%${search}%`)
      })
    }

    const users = await query.paginate(page, limit)

    return response.ok(users)
  }

  /**
   * GET /admin/users/:id
   * Détails d'un utilisateur + ses trips
   */
  async showUser({ params, response }: HttpContext) {
    const user = await User.query()
      .where('id', params.id)
      .select('id', 'full_name', 'email', 'is_verified', 'is_admin', 'created_at')
      .preload('createdTrips', (q) => q.orderBy('created_at', 'desc').limit(10))
      .preload('tripParticipations', (q) => q.preload('trip').orderBy('created_at', 'desc').limit(10))
      .firstOrFail()

    return response.ok(user)
  }

  /**
   * PATCH /admin/users/:id
   * Modifier un utilisateur (fullName, email, isAdmin, isVerified)
   */
  async updateUser({ params, request, response }: HttpContext) {
    const user = await User.findOrFail(params.id)

    const data = request.only(['fullName', 'email', 'isAdmin', 'isVerified'])

    user.merge(data)
    await user.save()

    return response.ok(user)
  }

  /**
   * DELETE /admin/users/:id
   * Supprimer un utilisateur
   */
  async deleteUser({ params, response }: HttpContext) {
    const user = await User.findOrFail(params.id)
    await user.delete()
    return response.noContent()
  }

  /**
   * GET /admin/trips
   * Liste paginée de tous les trips
   */
  async indexTrips({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const search = request.input('search', '')
    const status = request.input('status', '')

    const query = Trip.query()
      .preload('creator', (q) => q.select('id', 'full_name', 'email'))
      .withCount('stops')
      .withCount('participants')
      .orderBy('created_at', 'desc')

    if (search) {
      query.whereILike('title', `%${search}%`)
    }

    if (status) {
      query.where('status', status)
    }

    const trips = await query.paginate(page, limit)

    return response.ok(trips)
  }

  /**
   * GET /admin/trips/:id
   * Détails d'un trip complet
   */
  async showTrip({ params, response }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .preload('creator')
      .preload('participants')
      .preload('stops', (q) => q.orderBy('order', 'asc'))
      .preload('expenses', (q) => q.preload('payer'))
      .firstOrFail()

    return response.ok(trip)
  }

  /**
   * PATCH /admin/trips/:id
   * Modifier le statut d'un trip
   */
  async updateTrip({ params, request, response }: HttpContext) {
    const trip = await Trip.findOrFail(params.id)

    const data = request.only(['status', 'title', 'description'])

    trip.merge(data)
    await trip.save()

    return response.ok(trip)
  }

  /**
   * DELETE /admin/trips/:id
   * Supprimer un trip (avec fichiers)
   */
  async deleteTrip({ params, response }: HttpContext) {
    const trip = await Trip.query()
      .where('id', params.id)
      .preload('stops', (q) => q.preload('photos'))
      .firstOrFail()

    // Supprimer les photos des stops
    for (const stop of trip.stops) {
      for (const photo of stop.photos) {
        try {
          await drive.use().delete(photo.filePath)
        } catch {
          // Continuer même si le fichier n'existe plus
        }
      }
    }

    // Supprimer la cover image du trip
    if (trip.coverImage) {
      try {
        await drive.use().delete(trip.coverImage)
      } catch {
        // Ignorer
      }
    }

    await trip.delete()

    return response.noContent()
  }

  /**
   * GET /admin/stops
   * Liste paginée de tous les stops
   */
  async indexStops({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const tripId = request.input('tripId', '')

    const query = Stop.query()
      .preload('trip', (q) => q.select('id', 'title'))
      .orderBy('trip_id', 'asc')
      .orderBy('order', 'asc')

    if (tripId) {
      query.where('trip_id', tripId)
    }

    const stops = await query.paginate(page, limit)

    return response.ok(stops)
  }

  /**
   * DELETE /admin/stops/:id
   * Supprimer un stop (avec ses photos)
   */
  async deleteStop({ params, response }: HttpContext) {
    const stop = await Stop.query()
      .where('id', params.id)
      .preload('photos')
      .firstOrFail()

    for (const photo of stop.photos) {
      try {
        await drive.use().delete(photo.filePath)
      } catch {
        // Continuer même si le fichier n'existe plus
      }
    }

    await stop.delete()

    return response.noContent()
  }

  /**
   * GET /admin/photos
   * Liste paginée de toutes les photos
   */
  async indexPhotos({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)

    const photos = await Photo.query()
      .preload('stop', (q) => q.select('id', 'title', 'trip_id'))
      .preload('user', (q) => q.select('id', 'full_name', 'email'))
      .orderBy('created_at', 'desc')
      .paginate(page, limit)

    return response.ok(photos)
  }

  /**
   * DELETE /admin/photos/:id
   * Supprimer une photo (+ fichier sur disque)
   */
  async deletePhoto({ params, response }: HttpContext) {
    const photo = await Photo.findOrFail(params.id)

    try {
      await drive.use().delete(photo.filePath)
    } catch {
      // Ignorer si le fichier n'existe plus
    }

    await photo.delete()

    return response.noContent()
  }
}
