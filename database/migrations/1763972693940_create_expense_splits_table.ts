import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'expense_splits'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign key vers la dépense
      table
        .integer('expense_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('expenses')
        .onDelete('CASCADE')

      // Foreign key vers l'utilisateur concerné par le split
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // Montant que cet utilisateur doit payer (sa part)
      table.decimal('amount', 10, 2).notNullable()

      // Si cet utilisateur a remboursé sa part
      table.boolean('is_paid').notNullable().defaultTo(false)

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
