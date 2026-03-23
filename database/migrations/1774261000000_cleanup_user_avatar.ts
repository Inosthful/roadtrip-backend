import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, async (table) => {
      // Supprimer profile_picture s'il existe
      if (await this.schema.hasColumn(this.tableName, 'profile_picture')) {
        table.dropColumn('profile_picture')
      }
      // Ajouter avatar s'il n'existe pas
      if (!(await this.schema.hasColumn(this.tableName, 'avatar'))) {
        table.string('avatar').nullable()
      }
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('profile_picture').nullable()
      table.dropColumn('avatar')
    })
  }
}
