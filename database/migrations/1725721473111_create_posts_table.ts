import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'posts'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {

      table.dropColumn('created_at')
      table.dropColumn('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}