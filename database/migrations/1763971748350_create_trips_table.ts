import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Informations de base du trip
      table.string('title', 255).notNullable()
      table.text('description').nullable()

      // Dates du voyage
      table.date('start_date').notNullable()
      table.date('end_date').notNullable()

      // Budget prévisionnel (10 chiffres total, 2 après la virgule)
      table.decimal('budget', 10, 2).notNullable().defaultTo(0)

      // Statut du voyage (enum simulé avec string + check)
      table
        .enum('status', ['planning', 'active', 'completed', 'cancelled'])
        .notNullable()
        .defaultTo('planning')

      // Foreign key vers le créateur du voyage
      table
        .integer('creator_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
