import Trip from '#models/trip'
import User from '#models/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class TripParticipant extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Foreign keys
  @column()
  declare tripId: number

  @column()
  declare userId: number

  // Rôle du participant
  @column()
  declare role: 'creator' | 'admin' | 'member'

  // Statut de l'invitation
  @column()
  declare invitationStatus: 'pending' | 'accepted' | 'declined'

  // Dates de tracking
  @column.dateTime()
  declare invitedAt: DateTime | null

  @column.dateTime()
  declare joinedAt: DateTime | null

  // Timestamps
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
