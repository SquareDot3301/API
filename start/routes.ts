import router from '@adonisjs/core/services/router'
import AdminController from '#controllers/admin_controller'


import './routes/user.js'
import './routes/auth.js'
import './routes/me.js'
import './routes/posts.js'
import './routes/comments.js'
import i18nManager from '@adonisjs/i18n/services/main'


router.get('/', async () => {
  const en = i18nManager.locale('fr')

  return {
    hello: en.t('message.greeting'),
  }
})

router.post('/create-admin', [AdminController, 'createAdmin'])

