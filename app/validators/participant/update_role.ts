import vine from '@vinejs/vine'

export const updateRoleValidator = vine.compile(
  vine.object({
    role: vine.enum(['organizer', 'member']),
  })
)
