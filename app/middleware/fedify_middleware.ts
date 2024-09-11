import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger';
import { createFederation, Federation, MemoryKvStore } from '@fedify/fedify'

export default class FedifyMiddleware {
  private federation: Federation<any>;

  constructor() {
    this.federation = createFederation<void>({
      kv: new MemoryKvStore(),
    });
  }

  public async handle(ctx: HttpContext, next: () => Promise<void>) {
    const { request, response } = ctx;
    logger.info(`[Fedify] - New request : ${request.completeUrl()}`)

    await this.federation.fetch(request, {
      contextData: () => {
        logger.info(`[Fedify] - The request ${request.completeUrl()} is managed`)
        return { undefined };
      },

      onNotFound: async () => {
        logger.info(`[Fedify] - The request ${request.completeUrl()} was not acceptable`)
        await next();
      },

      onNotAcceptable: async () => {
        logger.info(`[Fedify] - The request ${request.completeUrl()} has a problem`)
        await next();

        if (response.response.statusCode === 404) {
          response.status(406).send('Not Acceptable');
        }
      }
    });
    logger.info(`[Fedify] - The request ${request.completeUrl()} was good !`)
  }
}
