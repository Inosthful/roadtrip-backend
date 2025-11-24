import vine from '@vinejs/vine'

export const updateStopValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().optional().nullable(),
    type: vine.enum(['accommodation', 'restaurant', 'activity', 'poi']).optional(),
    latitude: vine.number().min(-90).max(90).optional(),
    longitude: vine.number().min(-180).max(180).optional(),
    address: vine.string().trim().optional().nullable(),
    arrivalDate: vine.date().optional().nullable(),
    departureDate: vine.date().optional().nullable(),
    order: vine.number().positive().optional(),
    isLocked: vine.boolean().optional(),
  })
)
