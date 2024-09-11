import Permissions from '#config/Enums/Permission'
import APIException from '#exceptions/api_exception'
import Comment from '#models/comment'
import Post from '#models/post'
import { commentsCreateValidator } from '#validators/comment'
import type { HttpContext } from '@adonisjs/core/http'

export default class CommentsController {
    public async list({ request }: HttpContext) {
        const postId = request.param('id')
        const page = request.input('page', 0)
        const perPage = 20

        const post = await Post.find(postId)
        if (!post) {
            throw new APIException('Le post demandé est introuvable.')
        }

        // const totalComments = await Database.from('comments').where('post', post.id).count('* as total')
        // const commentCount = totalComments[0]?.total || 0

        // response.header('nbComments', commentCount.toString())

        const comments = await Comment.query()
            .preload('author')
            .orderBy('created_at', 'desc')
            .where('post', '=', postId)
            .paginate(page, perPage)

        return comments
    }

    public async new({ request, response, auth }: HttpContext) {
        if (auth.user?.permission === Permissions.SuspendedAccount) {
            throw new APIException('Votre compte est suspendu ! Vous ne pouvez pas commentez.')
        }
        const post = await Post.findBy('slug', request.param('slug'))
        if (!post) throw new APIException('Le post demandé est introuvable.')

        const data = request.validateUsing(commentsCreateValidator)

        const comment = new Comment()
        comment.content = (await data).content
        await comment.related('author').associate(auth.user!)
        await comment.related('post').associate(post)
        await comment.save()

        return response.noContent()
    }
}