/**
 * Routes API pour la gestion des photos
 *
 * Toutes les routes sont protégées par le middleware 'auth'
 */

import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Lazy loading du controller pour de meilleures performances
const PhotosController = () => import('#controllers/photos_controller')

/**
 * Routes imbriquées : /stops/:stopId/photos
 * Pour uploader et lister les photos d'une étape
 */
router
  .group(() => {
    // POST /stops/:stopId/photos - Upload une photo pour une étape
    router.post('/stops/:stopId/photos', [PhotosController, 'store'])

    // GET /stops/:stopId/photos - Liste toutes les photos d'une étape
    router.get('/stops/:stopId/photos', [PhotosController, 'index'])
  })
  .middleware(middleware.auth())

/**
 * Routes directes : /photos/:id
 * Pour gérer une photo spécifique
 */
router
  .group(() => {
    // GET /photos/:id - Affiche les détails d'une photo
    router.get('/photos/:id', [PhotosController, 'show'])

    // PATCH /photos/:id - Modifie les métadonnées d'une photo
    router.patch('/photos/:id', [PhotosController, 'update'])

    // DELETE /photos/:id - Supprime une photo
    router.delete('/photos/:id', [PhotosController, 'destroy'])
  })
  .middleware(middleware.auth())
