import * as Koa from 'koa';
import * as Router from 'koa-router';

interface Options {
	config: {};
}

export default class Aedris {
	public readonly config: {};

	private server: Koa;

	public readonly backendRouter: Router;
	public readonly middlewareRouter: Router;
	public readonly apiRouter: Router;

	public constructor({config}: Options) {
		this.config = config;

		this.server = new Koa();

		this.backendRouter = new Router();
		this.middlewareRouter = new Router();
		this.apiRouter = new Router();

		this.backendRouter.use('/', this.middlewareRouter.routes());
		this.backendRouter.use('/v1/', this.apiRouter.routes());

		this.server.use(this.backendRouter.routes());
	}

	public listen(port: number): void {
		this.server.listen(port);
	}
}
