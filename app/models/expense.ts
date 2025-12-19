import ExpenseSplit from '#models/expense_split'
import Stop from '#models/stop'
import Trip from '#models/trip'
import User from '#models/user'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class Expense extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Foreign keys
  @column()
  declare tripId: number

  @column()
  declare stopId: number | null

  // Informations de la dépense
  @column()
  declare title: string

  @column()
  declare description: string | null

  @column()
  declare amount: number

  // Catégorie
  @column()
  declare category: 'transport' | 'fuel' | 'tolls' | 'accommodation' | 'food' | 'activity' | 'other'

  // Qui a payé
  @column()
  declare paidBy: number

  // Date de la dépense
  @column.date()
  declare expenseDate: DateTime

  // Timestamps
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Trip)
  declare trip: BelongsTo<typeof Trip>

  @belongsTo(() => Stop)
  declare stop: BelongsTo<typeof Stop>

  @belongsTo(() => User, {
    foreignKey: 'paidBy',
  })
  declare payer: BelongsTo<typeof User>

  @hasMany(() => ExpenseSplit)
  declare splits: HasMany<typeof ExpenseSplit>
}
