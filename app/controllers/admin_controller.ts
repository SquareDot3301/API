import User from '#models/user'
import { adminRegisterValidator } from '#validators/auth'
import type { HttpContext } from '@adonisjs/core/http'

export default class AdminController {
    public async createAdmin({ request, response }: HttpContext) {
        const payload = await request.validateUsing(adminRegisterValidator)

        const user = await User.create(payload)

        return response.created(user)
    }
}