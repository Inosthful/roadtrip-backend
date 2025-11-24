import vine from '@vinejs/vine'

export const updateTripValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().optional().nullable(),
    startDate: vine.date().optional(),
    endDate: vine.date().optional(),
    budget: vine.number().min(0).optional(),
    status: vine.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  })
)
