import vine from '@vinejs/vine'

export const createTripValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().optional(),
    startDate: vine.date(),
    endDate: vine.date().afterField('startDate'),
    budget: vine.number().min(0).optional(),
    status: vine.enum(['planning', 'active', 'completed', 'cancelled']).optional(),
  })
)
