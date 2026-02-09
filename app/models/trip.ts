import Expense from '#models/expense'
import Stop from '#models/stop'
import TripParticipant from '#models/trip_participant'
import User from '#models/user'
import { BaseModel, belongsTo, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Trip extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Informations de base
  @column()
  declare title: string

  @column()
  declare description: string | null

  // Dates du voyage
  @column.date()
  declare startDate: DateTime

  @column.date()
  declare endDate: DateTime

  // Budget prévisionnel
  @column()
  declare budget: number

  // Statut du voyage (enum)
  @column()
  declare status: 'planning' | 'active' | 'completed' | 'cancelled'

  @column()
  declare coverImage: string | null

  // Détails Voiture
  @column()
  declare carConsumption: number

  @column()
  declare fuelPrice: number

  @column()
  declare tollRate: number

  @column()
  declare settings: any

  @column()
  declare creatorId: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  // Un trip appartient à un créateur (User)
  @belongsTo(() => User, {
    foreignKey: 'creatorId',
  })
  declare creator: BelongsTo<typeof User>

  // Un trip a plusieurs stops (étapes)
  @hasMany(() => Stop)
  declare stops: HasMany<typeof Stop>

  // Un trip a plusieurs dépenses
  @hasMany(() => Expense)
  declare expenses: HasMany<typeof Expense>

  // Un trip a plusieurs participants (relation Many-to-Many via table pivot)
  @manyToMany(() => User, {
    pivotTable: 'trip_participants',
    localKey: 'id',
    pivotForeignKey: 'trip_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['id', 'role', 'invitation_status', 'invited_at', 'joined_at'],
  })
  declare participants: ManyToMany<typeof User>

  // Accès direct à la table pivot trip_participants
  @hasMany(() => TripParticipant)
  declare tripParticipants: HasMany<typeof TripParticipant>
}
