import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trip_participants'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign keys pour la relation Many-to-Many
      table
        .integer('trip_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('trips')
        .onDelete('CASCADE')

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // Rôle du participant dans le voyage
      table.enum('role', ['creator', 'organizer', 'member']).notNullable().defaultTo('member')

      // Statut de l'invitation
      table
        .enum('invitation_status', ['pending', 'accepted', 'declined'])
        .notNullable()
        .defaultTo('pending')

      // Dates de tracking
      table.timestamp('invited_at').nullable()
      table.timestamp('joined_at').nullable()

      // Contrainte unique : un user ne peut être qu'une seule fois dans un trip
      table.unique(['trip_id', 'user_id'])

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
