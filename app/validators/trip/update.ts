import vine from '@vinejs/vine'

export const updateTripValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().optional().nullable(),
    startDate: vine.date().optional(),
    endDate: vine.date().afterField('startDate').optional(),
    budget: vine.number().min(0).optional(),
    status: vine.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
    category: vine.string().optional().nullable(),
    cover_image: vine.file({
      size: '5mb',
      extnames: ['jpg', 'png', 'jpeg', 'webp']
    }).optional(),
    carConsumption: vine.number().min(0).optional(),
    fuelPrice: vine.number().min(0).optional(),
    tollRate: vine.number().min(0).optional(),
    settings: vine.object({}).allowUnknownProperties().optional(),
  })
)
