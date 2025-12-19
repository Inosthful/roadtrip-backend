import vine from '@vinejs/vine'

export const createStopValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().optional(),
    type: vine.enum(['accommodation', 'restaurant', 'activity', 'poi', 'city']),
    latitude: vine.number().min(-90).max(90),
    longitude: vine.number().min(-180).max(180),
    address: vine.string().trim().optional(),
    arrivalDate: vine.date().optional(),
    departureDate: vine.date().optional(),
    order: vine.number().positive().optional(),
    isLocked: vine.boolean().optional(),
    price: vine.number().min(0).optional(),
    paidBy: vine.number().positive().optional(),
  })
)
