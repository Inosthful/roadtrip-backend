import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'expenses'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign key vers le voyage
      table
        .integer('trip_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trips')
        .onDelete('CASCADE')

      // Foreign key vers l'étape (optionnel, peut être une dépense générale)
      table
        .integer('stop_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('stops')
        .onDelete('SET NULL')

      // Informations de la dépense
      table.string('title', 255).notNullable()
      table.text('description').nullable()
      table.decimal('amount', 10, 2).notNullable()

      // Catégorie de dépense
      table
        .enum('category', ['transport', 'accommodation', 'food', 'activity', 'other'])
        .notNullable()

      // Qui a payé
      table
        .integer('paid_by')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // Date de la dépense
      table.date('expense_date').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
