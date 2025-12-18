import vine from '@vinejs/vine'

export const updateExpenseValidator = vine.compile(
  vine.object({
    title: vine.string().trim().minLength(3).maxLength(255).optional(),
    description: vine.string().trim().optional().nullable(),
    amount: vine.number().min(0).optional(),
    category: vine
      .enum(['transport', 'fuel', 'tolls', 'accommodation', 'food', 'activity', 'other'])
      .optional(),
    expenseDate: vine.date().optional(),
    paidBy: vine.number().positive().optional(),
  })
)
