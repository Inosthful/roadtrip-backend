import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'stops'

  async up() {
    this.schema.raw('ALTER TABLE "stops" DROP CONSTRAINT "stops_type_check"')
    this.schema.raw("ALTER TABLE \"stops\" ADD CONSTRAINT \"stops_type_check\" CHECK (\"type\" IN ('accommodation', 'restaurant', 'activity', 'poi', 'city'))")
  }

  async down() {
    this.schema.raw('ALTER TABLE "stops" DROP CONSTRAINT "stops_type_check"')
    this.schema.raw("ALTER TABLE \"stops\" ADD CONSTRAINT \"stops_type_check\" CHECK (\"type\" IN ('accommodation', 'restaurant', 'activity', 'poi'))")
  }
}
