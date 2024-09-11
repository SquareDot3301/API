import APIException from '#exceptions/api_exception'
import Like from '#models/like'
import Post from '#models/post'
import { postsGetValidator, postsNewValidator } from '#validators/post'
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import fs from 'fs/promises'
import sharp from 'sharp'

export default class PostsController {
    public async list({ request }: HttpContext) {
        const data = request.validateUsing(postsGetValidator)

        let query = Post.query().orderBy('created_at', 'desc')
            .preload('author', (builder) => {
                builder.select(['username', 'pp', 'permission', 'id',])
            }).select([
                'id',
                'title',
                'slug',
                'created_at',
                'updated_at',
                'image',
                'description',
                'author',
                'tag',
            ])

        if ((await data).limit && !(await data).page) {
            query = query.limit((await data).limit)
        }

        if ((await data).limit && (await data).page) {
            query = query.paginate((await data).page, (await data).limit)
        }

        if ((await data).users) {
            console.log((await data).users)
            query = query.where('author', (await data).users)
        }

        let posts = await query

        return posts
    }

    public async get({ request, response, auth }: HttpContext) {
        const post = await Post.query()
            .preload('author')
            .preload('comments', (query) => query.limit(20))
            // .preload('like')
            .where('slug', '=', request.param('slug'))
            .select([
                'id',
                'title',
                'slug',
                'content',
                'tag',
                'created_at',
                'updated_at',
                'image',
                'description',
                'author'
            ])
            .first()

        if (!post) {
            throw new APIException('Le post demandé est introuvable.')
        }

        const user = auth.user

        let has_liked: boolean = false

        if (post && user) {
            const existingLike = await Like.query().where('user', user.id).where('post', post.id).first()

            if (existingLike) {
                has_liked = true
            }
        }

        response.header('has_liked', has_liked)

        return post
    }


    public async new({ request, auth, response }: HttpContext) {
        const data = request.validateUsing(postsNewValidator)
        const post = new Post()

        post.title = (await data).title
        post.description = (await data).description
        post.content = (await data).content
        post.image = (await data).image
        if ((await data).tag) {
            post.tag = (await data).tag || ""
        }
        await post.related('author').associate(auth.user!)
        await post.save()

        return response.ok("Post créé !")
    }

    public async update({ request, response, auth }: HttpContext) {
        const post = await Post.findBy('slug', request.param('slug'))

        if (!post) throw new APIException('Le post demandé est introuvable.')
        if (!auth.user) throw new APIException("Vous n'êtes pas connectés !")

        if (auth.user.id !== post.author) // NE PAS CHANGER
            throw new APIException("Vous n'avez pas la permission de modifier cet article.")


        const { title, content, description, image, tag } = request.only([
            'title',
            'content',
            'description',
            'image',
            'tag',
        ])

        await post.merge({ title, content, description, image, tag }).save()

        return response.noContent()
    }

    public async delete({ request, response, auth }: HttpContext) {
        const post = await Post.findBy('slug', request.param('slug'))
        if (!post) throw new APIException('Le post demandé est introuvable.')
        if (!auth.user) throw new APIException("Vous n'êtes pas connectés !")

        if (auth.user.id !== post.author) throw new APIException("Vous n'êtes pas l'auteur de cet article.") // NE PAS CHANGER

        await post.delete()
        return response.noContent()
    }

    public async upload({ request, response }: HttpContext) {
        const image = request.file('image')

        if (!image) {
            throw new APIException("Il n'y a aucun fichier à télécharger")
        }

        const fileName = image.clientName
        const resizedFileName = fileName
        const resizedImagePath = app.publicPath() + '/posts/' + resizedFileName

        try {
            await image.move(app.tmpPath(), {
                name: fileName,
                overwrite: true,
            })

            await sharp(app.tmpPath() + '/' + fileName)
                .resize(104)
                .toFile(resizedImagePath)

            await fs.unlink(app.tmpPath() + '/' + fileName)

            return response.ok({ path: resizedFileName })
        } catch (error) {
            throw new APIException("Erreur durant l'upload")
        }
    }

    public async show({ request, response }: HttpContext) {
        const imageName = request.param('imageName')

        try {
            const imagePath = app.publicPath(`/posts/${imageName}`)
            await fs.access(imagePath)

            return response.download(imagePath)
        } catch (error) {
            throw new APIException(`L'image ${error} n'a pas été trouvée...`)
        }
    }
}