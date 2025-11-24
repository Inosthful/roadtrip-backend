import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const StopsController = () => import('#controllers/stops_controller')

router
  .group(() => {
    // Liste toutes les étapes d'un voyage
    router.get('/trips/:tripId/stops', [StopsController, 'index'])

    // Créer une nouvelle étape pour un voyage
    router.post('/trips/:tripId/stops', [StopsController, 'store'])

    // Récupérer une étape spécifique
    router.get('/stops/:id', [StopsController, 'show'])

    // Mettre à jour une étape
    router.patch('/stops/:id', [StopsController, 'update'])

    // Supprimer une étape
    router.delete('/stops/:id', [StopsController, 'destroy'])
  })
  .use(middleware.auth()) // Toutes les routes nécessitent l'authentification
