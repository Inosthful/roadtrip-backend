import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('toll_rate').defaultTo(0.12)
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('toll_rate')
    })
  }
}
