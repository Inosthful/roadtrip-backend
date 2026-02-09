import Photo from '#models/photo'
import Trip from '#models/trip'
import User from '#models/user'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Stop extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Foreign key vers le voyage
  @column()
  declare tripId: number

  // Informations de base
  @column()
  declare title: string

  @column()
  declare description: string | null

  // Type d'étape
  @column()
  declare type: 'accommodation' | 'restaurant' | 'activity' | 'poi' | 'city'

  // Géolocalisation
  @column()
  declare latitude: number

  @column()
  declare longitude: number

  @column()
  declare address: string | null

  // Ordre dans l'itinéraire
  @column()
  declare order: number

  @column()
  declare isLocked: boolean

  // Dates d'arrivée/départ
  @column.dateTime()
  declare arrivalDate: DateTime | null

  @column.dateTime()
  declare departureDate: DateTime | null

  // Créateur de l'étape
  @column()
  declare createdBy: number

  // Timestamps
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => User, {
    foreignKey: 'createdBy',
  })
  declare creator: BelongsTo<typeof User>

  @hasMany(() => Photo)
  declare photos: HasMany<typeof Photo>
}
