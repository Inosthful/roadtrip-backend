import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      // Clé primaire auto-incrémentée
      table.increments('id').primary()

      // Informations de base
      table.string('full_name', 255).notNullable()
      table.string('email', 254).notNullable().unique()

      // Mot de passe hashé (avec bcrypt ou scrypt)
      table.string('password', 180).notNullable()

      // Timestamps automatiques
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
