// import { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { BaseModel, beforeSave, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import User from './user.js'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import { CherryPick, ModelObject } from '@adonisjs/lucid/types/model'
import Like from './like.js'
import Comment from './comment.js'
import { slugifyAdapter } from '../../utils/slugify.js'

export default class Post extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  // @column()
  // declare authors: number

  // @belongsTo(() => User, {
  //   foreignKey: 'authors',
  // })
  // declare author: BelongsTo<typeof User>

  @column()
  @belongsTo(() => User, { foreignKey: 'author' })
  declare author: BelongsTo<typeof User>

  @column()
  declare title: string

  @column()
  declare description: string

  @column()
  declare image: string

  @column()
  declare tag: string

  @column()
  declare slug: string

  @column()
  @hasMany(() => Comment, {
    foreignKey: 'post',
    onQuery: (query) => query.preload('author').orderBy('created_at', 'desc'),
  })
  declare comments: HasMany<typeof Comment>

  @column()
  @hasMany(() => Like, {
    foreignKey: 'post',
    onQuery: (query) => query.preload('user').orderBy('created_at', 'desc'),
  })
  declare like: HasMany<typeof Like>

  @column()
  declare content: string

  @column()
  declare comment_count: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // @computed({ serializeAs: 'has_permission' })
  // public get hasPermission() {
  //   const user = HttpContext.get()!.auth.user || {
  //     id: 0,
  //     permission: Permissions.User,
  //   }

  //   console.log('authorId:', this.author, 'user.id:', user.id)
  //   return Number(this.author) === user.id || user.permission >= Permissions.Redactor
  // }
  // @computed()
  // public get hasPermission(): boolean {
  //   const ctx = HttpContext.get()
  //   const user = ctx?.auth.use

  //   if (!user) {
  //     return false
  //   }

  //   return this.author === user.id
  // }

  public serialize(cherryPick?: CherryPick | undefined): ModelObject {
    return {
      ...this.serializeAttributes(cherryPick?.fields, false),
      ...this.serializeComputed(cherryPick?.fields),
      ...this.serializeRelations(
        {
          author: {
            fields: { omit: ['email', 'updated_at', 'birthdate'] },
          },
          user: {
            fields: { omit: ['email', 'updated_at', 'birthdate'] },
          },
          like: { fields: { omit: ['post'] } },
          comments: { fields: { omit: ['post'] } },
        },
        false
      ),
    }
  }

  @beforeSave()
  static async setSlug(post: Post) {
    if (!post.slug) {
      post.slug = await slugifyAdapter(post.title, {
        fieldName: 'slug',
        tableName: 'posts',
      })
    }
  }
}