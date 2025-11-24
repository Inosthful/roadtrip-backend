import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'photos'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      // Foreign key vers l'étape
      table
        .integer('stop_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('stops')
        .onDelete('CASCADE')

      // Foreign key vers l'utilisateur qui a uploadé
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      // Chemin du fichier
      table.string('file_path', 500).notNullable()

      // Légende optionnelle
      table.text('caption').nullable()

      // Géolocalisation optionnelle (coordonnées EXIF de la photo)
      table.decimal('latitude', 10, 8).nullable()
      table.decimal('longitude', 11, 8).nullable()

      // Date de prise de vue (EXIF)
      table.timestamp('taken_at').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
