import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'photos'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('caption')
      table.dropColumn('latitude')
      table.dropColumn('longitude')
      table.dropColumn('taken_at')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('caption').nullable()
      table.decimal('latitude', 10, 8).nullable()
      table.decimal('longitude', 11, 8).nullable()
      table.timestamp('taken_at').nullable()
    })
  }
}
