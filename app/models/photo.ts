import Stop from '#models/stop'
import User from '#models/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Photo extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Foreign keys
  @column()
  declare stopId: number

  @column()
  declare userId: number

  // Informations de la photo
  @column()
  declare filePath: string

  // Timestamps
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Stop)
  declare stop: BelongsTo<typeof Stop>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
