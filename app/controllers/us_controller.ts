import Permissions from '#config/Enums/Permission'
import APIException from '#exceptions/api_exception'
import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'
import sharp from 'sharp'
import fs from 'fs/promises'
import app from '@adonisjs/core/services/app'
import env from '#start/env'

export default class UsController {
    public async me({ auth, response }: HttpContext) {
        try {
            const user = auth.getUserOrFail()
            return response.ok(user)
        } catch (error) {
            return response.unauthorized({ error: 'User not found' })
        }
    }

    public async delete({ response, auth }: HttpContext) {
        if (!auth.user) {
            throw new APIException("Vous n'êtes pas connectés !")
        }
        if (auth.user?.permission === Permissions.Administrator) {
            throw new APIException(
                'Vous êtes un administrateur, votre compte ne peut pas être supprimé !'
            )
        }
        const token = auth.user?.currentAccessToken.identifier
        if (!token) {
            return response.badRequest({ message: 'Token not found' })
        }
        await auth.user!.delete()
        await User.accessTokens.delete(auth.user, token)
        return response.noContent()
    }

    public async update({ request, response, auth }: HttpContext) {
        const { email, username, password, biography } = request.only([
            'email',
            'username',
            'password',
            'biography',
        ])

        const user = auth.user!

        if (user.permission === -1) {
            throw new APIException('Votre compte est suspendu ! Vous ne pouvez pas faire ça.')
        }

        if (
            email &&
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,253}[a-zA-Z0-9])?)*$/.test(
                email
            )
        ) {
            user.email = email
        } else if (email) {
            throw new APIException("L'adresse email n'est pas valide.")
        }

        if (
            username &&
            /^[a-zA-Z][\w]{2,}$/.test(username) &&
            username.length > 4 &&
            username.length < 12
        ) {
            user.username = username
        } else if (username && username.length <= 3) {
            throw new APIException("Le nom d'utilisateur doit faire plus de 4 caractères.")
        } else if (username && username.length > 12) {
            throw new APIException("Le nom d'utilisateur doit faire moins de 12 caractères.")
        }

        if (password && password.length > 5) {
            user.password = password
        } else if (password && password.length <= 5) {
            throw new APIException('Le mot de passe doit faire plus de 5 caractères.')
        }

        if (biography && biography.length <= 200) {
            user.biography = biography
        } else if (biography.length > 200) {
            throw new APIException('La biographie ne peut excéder 200 caractères.')
        }

        await auth.user!.merge(user).save()

        return response.noContent()
    }

    public async upload({ request, response, auth }: HttpContext) {
        const image = request.file('image')

        if (!image) {
            throw new APIException("Il n'y a aucun fichier à télécharger")
        }

        const user = await User.find(auth.user?.id)

        if (!user) {
            throw new APIException("Vous n'êtes pas identifiés !")
        }

        if (user.permission === -1) {
            throw new APIException('Votre compte est suspendu ! Vous ne pouvez pas faire ça.')
        }

        const fileName = `${auth.user!.id}.png`
        const resizedImagePath = app.publicPath() + '/users/' + fileName

        try {
            await image.move(app.tmpPath(), {
                name: fileName,
                overwrite: true,
            })

            await sharp(app.tmpPath() + '/' + fileName)
                .resize(500, 500)
                .toFile(resizedImagePath)

            await fs.unlink(app.tmpPath() + '/' + fileName)

            user.pp = `${env.get('API')}/public/users/${fileName}`
            await user.save()

            return response.ok({ resizedImagePath })
        } catch (error) {
            throw new APIException("Erreur durant l'upload")
        }
    }

    public async show({ request, response }: HttpContext) {
        const imageName = request.param('imageName')

        try {
            const imagePath = app.publicPath(`/users/${imageName}` + '.png')
            await fs.access(imagePath)

            return response.download(imagePath)
        } catch (error) {
            throw new APIException(`L'image ${error} n'a pas été trouvée...`)
        }
    }

    public async deleteImage({ response, auth }: HttpContext) {
        const user = auth.user

        if (!user) {
            throw new APIException("Vous n'êtes pas identifiés !")
        }

        if (user.permission === -1) {
            throw new APIException('Votre compte est suspendu ! Vous ne pouvez pas faire ça.')
        }

        try {
            const imagePath = `users/${user.id}.png`
            await fs.unlink(app.publicPath(imagePath))

            user.pp = null
            await user.save()

            return response.ok('Image deleted successfully')
        } catch (error) {
            throw new APIException('Erreur dans le serveur')
        }
    }
}