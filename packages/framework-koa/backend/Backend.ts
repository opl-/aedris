import Koa from 'koa';
import {Router} from 'koa-butterfly';
import koaSend from 'koa-send';
import path from 'path';

const APP_ROOT = process.env.AEDRIS_DIR || process.cwd();

export class Backend extends Koa {
	/* The main app router */
	readonly router = new Router();

	/* Router for all `/_/` endpoints. */
	readonly backendRouter = new Router();

	/* Router for API endpoints. */
	readonly apiRouter = new Router();

	constructor() {
		super();

		// TODO: config
		this.backendRouter.use('/v1*', this.apiRouter);

		// Serve static files
		this.backendRouter.get('/res/:path+', async (ctx) => {
			try {
				await koaSend(ctx, ctx.params.path, {
					root: path.resolve(APP_ROOT, 'frontend-client/'),
				});
			} catch (ex) {
				if (ex.status !== 404) throw ex;
			}
		});

		this.router.use('/_*', this.backendRouter);

		// Mount the global router
		this.use(this.router.middleware());
	}
}
