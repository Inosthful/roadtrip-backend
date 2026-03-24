import vine from '@vinejs/vine'

export const inviteParticipantValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email(),
  })
)
