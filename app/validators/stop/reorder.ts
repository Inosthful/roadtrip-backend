import vine from '@vinejs/vine'

export const reorderStopsValidator = vine.compile(
  vine.object({
    stops: vine.array(
      vine.object({
        id: vine.number(),
        order: vine.number(),
      })
    ),
  })
)
