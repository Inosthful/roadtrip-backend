import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

// Lazy loading du controller
const PlacesController = () => import('#controllers/places_controller')

/**
 * Routes Google Places API
 *
 * Toutes les routes sont protégées par auth (nécessite un JWT valide)
 */
router
  .group(() => {
    // GET /places/autocomplete?query=Paris
    router.get('/autocomplete', [PlacesController, 'autocomplete'])

    // GET /places/details/:placeId
    router.get('/details/:placeId', [PlacesController, 'details'])

    // GET /places/nearby?latitude=48.8566&longitude=2.3522&radius=5000&types=restaurant&limit=10
    router.get('/nearby', [PlacesController, 'nearby'])
  })
  .prefix('/places')
  .use(middleware.auth()) // 🔒 Routes protégées par authentification
