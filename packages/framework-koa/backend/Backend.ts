import {Cottage} from 'cottage';
import Koa, {Middleware} from 'koa';
import compose from 'koa-compose';
import koaStatic from 'koa-static';
import path from 'path';

const APP_ROOT = process.env.AEDRIS_DIR || process.cwd();

export class Backend extends Koa {
	/* The main app router */
	readonly router = new Cottage();

	/* Router for all `/_/` endpoints. */
	readonly backendRouter = new Cottage();

	/* Router for API endpoints. */
	readonly apiRouter = new Cottage();

	/* Array of middleware executed for all requests. */
	readonly globalMiddleware: Middleware[] = [];

	/* Array of middleware executed for all API endpoints. */
	readonly apiMiddleware: Middleware[] = [];

	// TODO: do i like this name? i'm not sure i like this name.
	/* Array of middleware executed when none of the backend middleware matches. This is primarily intended to be used for frontend. */
	readonly fallbackMiddleware: Middleware[] = [];

	constructor() {
		super();

		// Set up backend routers. Routers get mounted as middleware instead of as Routers to allow modification after mounting.
		this.router.use(compose(this.globalMiddleware));
		this.apiRouter.use(compose(this.apiMiddleware));

		// TODO: config
		this.backendRouter.use('/v1', this.apiRouter.callback());

		this.backendRouter.use('/res', koaStatic(path.resolve(APP_ROOT, 'dist/frontend-client/')));

		this.router.use('/_', this.backendRouter.callback());

		this.router.use(compose(this.fallbackMiddleware));

		// Mount the global router
		this.use(this.router.callback());
	}
}
