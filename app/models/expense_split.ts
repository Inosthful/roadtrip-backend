import Expense from '#models/expense'
import User from '#models/user'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { DateTime } from 'luxon'

export default class ExpenseSplit extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // Foreign keys
  @column()
  declare expenseId: number

  @column()
  declare userId: number

  // Montant que cet utilisateur doit payer (sa part)
  @column()
  declare amount: number

  // Si cet utilisateur a remboursé sa part
  @column()
  declare isPaid: boolean

  // Timestamps
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Expense)
  declare expense: BelongsTo<typeof Expense>

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>
}
