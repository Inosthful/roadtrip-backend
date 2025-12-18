import { DbAccessTokensProvider } from '@adonisjs/auth/access_tokens'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { compose } from '@adonisjs/core/helpers'
import hash from '@adonisjs/core/services/hash'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'
import Trip from '#models/trip'
import Stop from '#models/stop'
import Photo from '#models/photo'
import Expense from '#models/expense'
import ExpenseSplit from '#models/expense_split'
import TripParticipant from '#models/trip_participant'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class User extends compose(BaseModel, AuthFinder) {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare fullName: string

  @column()
  declare email: string

  @column()
  declare isVerified: boolean

  @column()
  declare verificationToken: string | null

  @column()
  declare resetPasswordToken: string | null

  @column.dateTime()
  declare resetPasswordExpiresAt: DateTime | null

  @column({ serializeAs: null })
  declare password: string

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  static accessTokens = DbAccessTokensProvider.forModel(User)

  // Relations
  // Trips créés par cet utilisateur
  @hasMany(() => Trip, {
    foreignKey: 'creatorId',
  })
  declare createdTrips: HasMany<typeof Trip>

  // Trips auxquels cet utilisateur participe (Many-to-Many)
  @manyToMany(() => Trip, {
    pivotTable: 'trip_participants',
    localKey: 'id',
    pivotForeignKey: 'user_id',
    relatedKey: 'id',
    pivotRelatedForeignKey: 'trip_id',
    pivotColumns: ['role', 'invitation_status', 'invited_at', 'joined_at'],
  })
  declare participatingTrips: ManyToMany<typeof Trip>

  // Accès direct aux participations (table pivot)
  @hasMany(() => TripParticipant)
  declare tripParticipations: HasMany<typeof TripParticipant>

  // Stops créés par cet utilisateur
  @hasMany(() => Stop, {
    foreignKey: 'createdBy',
  })
  declare createdStops: HasMany<typeof Stop>

  // Photos uploadées par cet utilisateur
  @hasMany(() => Photo)
  declare photos: HasMany<typeof Photo>

  // Dépenses payées par cet utilisateur
  @hasMany(() => Expense, {
    foreignKey: 'paidBy',
  })
  declare paidExpenses: HasMany<typeof Expense>

  // Parts de dépenses de cet utilisateur
  @hasMany(() => ExpenseSplit)
  declare expenseSplits: HasMany<typeof ExpenseSplit>
}
