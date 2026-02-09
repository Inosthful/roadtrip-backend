/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

// Routes d'authentification
import './routes/auth.js'

// Routes de gestion des voyages
import './routes/trips.js'

// Routes de gestion des étapes
import './routes/stops.js'

// Routes de gestion des dépenses
import './routes/expenses.js'

// Routes de gestion des participants et invitations
import './routes/participants.js'

// Routes de gestion des photos
import './routes/photos.js'

// Routes Google Places API (autocomplete, détails de lieux)
import './routes/places.js'
