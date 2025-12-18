import vine from '@vinejs/vine'

export const createExpenseValidator = vine.compile(
  vine.object({
    tripId: vine.number().positive(),
    stopId: vine.number().positive().optional(),
    title: vine.string().trim().minLength(3).maxLength(255),
    description: vine.string().trim().optional(),
    amount: vine.number().min(0),
    category: vine.enum([
      'transport',
      'fuel',
      'tolls',
      'accommodation',
      'food',
      'activity',
      'other',
    ]),
    expenseDate: vine.date(),
    paidBy: vine.number().positive().optional(),
  })
)
