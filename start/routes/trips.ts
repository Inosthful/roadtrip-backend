import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const TripsController = () => import('#controllers/trips_controller')

router
  .group(() => {
    // Liste tous les trips de l'utilisateur
    router.get('/', [TripsController, 'index'])

    // Créer un nouveau trip
    router.post('/', [TripsController, 'store'])

    // Récupérer un trip spécifique
    router.get('/:id', [TripsController, 'show'])

    // Mettre à jour un trip
    router.patch('/:id', [TripsController, 'update'])

    // Supprimer un trip
    router.delete('/:id', [TripsController, 'destroy'])
  })
  .prefix('/trips')
  .use(middleware.auth()) // Toutes les routes nécessitent l'authentification
