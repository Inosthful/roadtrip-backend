import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
const AuthController = () => import('#controllers/auth_controller')

router
  .group(() => {
    router.post('/register', [AuthController, 'register'])
    router.post('/login', [AuthController, 'login'])
    router.post('/verify-email', [AuthController, 'verifyEmail'])
    router.post('/forgot-password', [AuthController, 'forgotPassword'])
    router.post('/reset-password', [AuthController, 'resetPassword'])
    router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
    router.get('/me', [AuthController, 'me']).use(middleware.auth())
    router.put('/me', [AuthController, 'update']).use(middleware.auth())
    router.delete('/me', [AuthController, 'delete']).use(middleware.auth())
  })
  .prefix('/auth')
