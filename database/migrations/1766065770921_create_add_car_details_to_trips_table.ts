import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'trips'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.float('car_consumption').defaultTo(7.0).comment('Liters per 100km')
      table.float('fuel_price').defaultTo(1.8).comment('Price per liter')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('car_consumption')
      table.dropColumn('fuel_price')
    })
  }
}