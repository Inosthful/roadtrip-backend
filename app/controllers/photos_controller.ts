import Photo from '#models/photo'
import Stop from '#models/stop'
import TripParticipant from '#models/trip_participant'
import { uploadPhotoValidator } from '#validators/photo/upload'
import { formatFileName } from '#helpers/file_naming'
import drive from '@adonisjs/drive/services/main'
import type { HttpContext } from '@adonisjs/core/http'

export default class PhotosController {
  /**
   * Helper privé : Vérifie que le user a accès au trip de l'étape
   * Retourne l'étape si accès autorisé, sinon lance une exception 403
   */
  private async checkStopAccess(
    stopId: number,
    userId: number,
    response: HttpContext['response']
  ): Promise<Stop> {
    // Charger l'étape avec le trip
    const stop = await Stop.query().where('id', stopId).preload('trip').firstOrFail()

    // Vérifier que le user est participant du trip
    const participant = await TripParticipant.query()
      .where('trip_id', stop.tripId)
      .where('user_id', userId)
      .where('invitation_status', 'accepted')
      .first()

    if (!participant) {
      return response.abort({ message: 'You do not have access to this trip' }, 403)
    }

    return stop
  }

  /**
   * POST /stops/:stopId/photos
   * Upload une photo pour une étape
   */
  async store({ params, request, auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const stopId = params.stopId

    // Vérifier l'accès au trip (lance une exception 403 si pas accès)
    await this.checkStopAccess(stopId, user.id, response)

    // Valider les données
    const payload = await request.validateUsing(uploadPhotoValidator)

    // Générer un nom de fichier unique avec extension : 6chars-nom-formate.ext
    const fileName = formatFileName(payload.photo.clientName, payload.photo.extname ?? '')

    // Sauvegarder le fichier avec Drive
    await payload.photo.moveToDisk(fileName)

    const photo = await Photo.create({
      stopId: stopId,
      userId: user.id,
      filePath: fileName,
    })

    return response.created({
      message: 'Photo uploaded successfully',
      data: photo,
    })
  }

  /**
   * GET /stops/:stopId/photos
   * Liste toutes les photos d'une étape
   */
  async index({ params, auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const stopId = params.stopId

    // Vérifier l'accès au trip (lance une exception 403 si pas accès)
    await this.checkStopAccess(stopId, user.id, response)

    // Récupérer toutes les photos de l'étape avec l'user qui les a uploadées
    const photos = await Photo.query()
      .where('stop_id', stopId)
      .preload('user', (query) => {
        query.select('id', 'fullName', 'email')
      })
      .orderBy('created_at', 'desc')

    return response.ok({
      message: 'Photos retrieved successfully',
      data: photos,
    })
  }

  /**
   * GET /photos/:id
   * Affiche les détails d'une photo
   */
  async show({ params, auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const photoId = params.id

    // Charger la photo avec ses relations
    const photo = await Photo.query()
      .where('id', photoId)
      .preload('stop', (query) => {
        query.preload('trip')
      })
      .preload('user', (query) => {
        query.select('id', 'fullName', 'email')
      })
      .firstOrFail()

    // Vérifier l'accès au trip
    const participant = await TripParticipant.query()
      .where('trip_id', photo.stop.tripId)
      .where('user_id', user.id)
      .where('invitation_status', 'accepted')
      .first()

    if (!participant) {
      return response.forbidden({
        message: 'You do not have access to this photo',
      })
    }

    return response.ok({
      message: 'Photo retrieved successfully',
      data: photo,
    })
  }

  /**
   * DELETE /photos/:id
   * Supprime une photo (fichier + entrée BDD)
   * Seul l'uploader de la photo peut la supprimer
   */
  async destroy({ params, auth, response }: HttpContext) {
    const user = await auth.getUserOrFail()
    const photoId = params.id

    // Charger la photo
    const photo = await Photo.findOrFail(photoId)

    // Vérifier que c'est bien l'uploader
    if (photo.userId !== user.id) {
      return response.forbidden({
        message: 'You can only delete your own photos',
      })
    }

    // Supprimer le fichier du disque
    await drive.use().delete(photo.filePath)

    // Supprimer l'entrée de la base de données
    await photo.delete()

    return response.noContent()
  }
}
