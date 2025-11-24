import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'stops'

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

      // Informations de base
      table.string('title', 255).notNullable()
      table.text('description').nullable()

      // Type d'étape
      table.enum('type', ['accommodation', 'restaurant', 'activity', 'poi']).notNullable()

      // Géolocalisation (10,8 pour latitude / 11,8 pour longitude)
      table.decimal('latitude', 10, 8).notNullable()
      table.decimal('longitude', 11, 8).notNullable()
      table.string('address', 500).nullable()

      // Ordre dans l'itinéraire
      table.integer('order').unsigned().notNullable().defaultTo(0)
      table.boolean('is_locked').notNullable().defaultTo(false)

      // Dates d'arrivée/départ (nullable car pas toujours connues)
      table.timestamp('arrival_date').nullable()
      table.timestamp('departure_date').nullable()

      // Créateur de l'étape
      table
        .integer('created_by')
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
