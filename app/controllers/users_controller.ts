import type { HttpContext } from '@adonisjs/core/http'
import User from "#models/user"
import Post from '#models/post'
import logger from '@adonisjs/core/services/logger'
import NotFoundException from '#exceptions/not_found_exception'
import APIException from '#exceptions/api_exception'
import Permissions from '#config/Enums/Permission'
import { gradeValidator } from '#validators/grade'

export default class UsersController {
    public async get({ params }: HttpContext) {
        logger.info('Fetching user by username %s', params.username)
        const user = await User.findBy('username', params.username)
        if (!user) {
            throw new NotFoundException("User not found !")
        }

        return user.serialize({
            fields: {
                omit: ['password', 'birthdate', 'email'],
            },
        })
    }

    public async list({ }: HttpContext) {
        logger.info('Fetching all users')
        return (await User.all()).map((user) => {
            return user.serialize({
                fields: {
                    omit: ['email', 'password', 'birthdate'],
                },
            })
        })
    }
    public async posts({ params }: HttpContext) {
        logger.info('Fetching user posts by id %s', params.id)
        let posts = Post.query()
            .orderBy('created_at', 'desc')
            .preload('author')
            .select([
                'id',
                'title',
                'slug',
                'created_at',
                'updated_at',
                'image',
                'description',
                'author',
            ])
            .where('author', '=', params.id)

            ; (await posts).map((post) => post.serializeAttributes({ omit: ['comments'] }))
        return await posts
    }

    public async delete({ request, response, auth }: HttpContext) {
        if (auth.user?.permission !== Permissions.Administrator)
            throw new APIException('Seul un administrateur peut effectuer cette opération.')

        const user: any = await User.findBy('username', request.param('username'))
        if (user.permission === Permissions.Administrator) {
            throw new APIException('Vous ne pouvez pas supprimer un administrateur / modérateur !')
        }
        await user.delete()
        return response.noContent()
    }

    public async upgrade({ request, response, auth, params }: HttpContext) {
        const payload = request.validateUsing(gradeValidator)

        const user = await User.findBy('username', params.username)
        if (!user) throw new APIException("L'utilisateur demandé est introuvable.")

        if (auth.user?.permission) {
            if (auth.user?.permission < Permissions.Redactor) {
                throw new APIException('Seul un modérateur peut effectuer cette opération.')
            }
            if (
                auth.user?.permission < Permissions.Administrator &&
                request.param('perms') > Permissions.Redactor
            ) {
                throw new APIException('Seul un administrateur peut effectuer cette opération.')
            }
        }

        user.permission = (await payload).permission

        await user.merge(user).save()

        return response.noContent()
    }
}