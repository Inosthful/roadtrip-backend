import vine from '@vinejs/vine'

export const updateTripValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().optional().nullable(),
    budget: vine.number().min(0).optional(),
    cover_image: vine.file({
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp']
    }).optional(),
    carConsumption: vine.number().min(0).optional(),
    fuelPrice: vine.number().min(0).optional(),
    tollRate: vine.number().min(0).optional(),
  })
)
