import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

export const createTripValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().optional(),
    startDate: vine.date().transform((value) => {
        const date = DateTime.fromJSDate(value)
        if (date < DateTime.now().startOf('day')) {
           // On permet la date d'aujourd'hui, mais pas avant
           // Si c'est vraiment "avant aujourd'hui", c'est invalide.
           // Mais VineJS transform ne sert pas à valider.
           // On va utiliser une rule custom si besoin ou le faire dans le controller.
           // Pour l'instant on laisse le transform standard implicite ou on le fait ici.
           return value
        }
        return value
    }),
    endDate: vine.date().afterField('startDate'),
    budget: vine.number().min(0).optional(),
    cover_image: vine.file({
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp']
    }).optional(),
    status: vine.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
    carConsumption: vine.number().min(0).optional(),
    fuelPrice: vine.number().min(0).optional(),
  })
)