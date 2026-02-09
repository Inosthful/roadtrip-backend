import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.jsonb('settings').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('settings')
    })
  }
}