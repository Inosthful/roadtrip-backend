import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AdminMiddleware {
  async handle({ auth, response }: HttpContext, next: NextFn) {
    const user = await auth.getUserOrFail()

    if (!user.isAdmin) {
      return response.forbidden({ message: 'Admin access required' })
    }

    return next()
  }
}
