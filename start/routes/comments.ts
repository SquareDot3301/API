import CommentsController from "#controllers/comments_controller"
import router from "@adonisjs/core/services/router"

router.group(() => {
    router.get(':id', [CommentsController, 'list'])
}).prefix('comments')