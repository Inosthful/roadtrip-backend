import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'expenses'

  async up() {
    // We need to drop the check constraint to add values, then re-add it with new values
    this.schema.raw('ALTER TABLE "expenses" DROP CONSTRAINT "expenses_category_check"')
    this.schema.raw("ALTER TABLE \"expenses\" ADD CONSTRAINT \"expenses_category_check\" CHECK (\"category\" IN ('transport', 'fuel', 'tolls', 'accommodation', 'food', 'activity', 'other'))")
  }

  async down() {
    this.schema.raw('ALTER TABLE "expenses" DROP CONSTRAINT "expenses_category_check"')
    this.schema.raw("ALTER TABLE \"expenses\" ADD CONSTRAINT \"expenses_category_check\" CHECK (\"category\" IN ('transport', 'accommodation', 'food', 'activity', 'other'))")
  }
}
