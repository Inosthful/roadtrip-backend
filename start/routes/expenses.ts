import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const ExpensesController = () => import('#controllers/expenses_controller')

router
  .group(() => {
    // Routes imbriquées (sous /trips/:tripId/expenses)
    router.get('/trips/:tripId/expenses', [ExpensesController, 'index'])
    router.post('/trips/:tripId/expenses', [ExpensesController, 'store'])
    router.get('/trips/:tripId/balance', [ExpensesController, 'balance'])

    // Routes directes (sous /expenses/:id)
    router.get('/expenses/:id', [ExpensesController, 'show'])
    router.patch('/expenses/:id', [ExpensesController, 'update'])
    router.delete('/expenses/:id', [ExpensesController, 'destroy'])
  })
  .use(middleware.auth())
