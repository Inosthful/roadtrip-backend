import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AdminController = () => import('#controllers/admin_controller')

router
  .group(() => {
    // Statistiques globales
    router.get('/stats', [AdminController, 'stats'])

    // Gestion des utilisateurs
    router.get('/users', [AdminController, 'indexUsers'])
    router.get('/users/:id', [AdminController, 'showUser'])
    router.patch('/users/:id', [AdminController, 'updateUser'])
    router.delete('/users/:id', [AdminController, 'deleteUser'])

    // Gestion des voyages
    router.get('/trips', [AdminController, 'indexTrips'])
    router.get('/trips/:id', [AdminController, 'showTrip'])
    router.patch('/trips/:id', [AdminController, 'updateTrip'])
    router.delete('/trips/:id', [AdminController, 'deleteTrip'])

    // Gestion des étapes
    router.get('/stops', [AdminController, 'indexStops'])
    router.delete('/stops/:id', [AdminController, 'deleteStop'])

    // Gestion des photos
    router.get('/photos', [AdminController, 'indexPhotos'])
    router.delete('/photos/:id', [AdminController, 'deletePhoto'])
  })
  .prefix('/admin')
  .use(middleware.auth())
  .use(middleware.admin())
