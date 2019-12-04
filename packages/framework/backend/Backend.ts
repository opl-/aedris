import {Cottage} from 'cottage';
import fs from 'fs';
import Koa, {Middleware} from 'koa';
import compose from 'koa-compose';
import koaStatic from 'koa-static';
import path from 'path';
import {createBundleRenderer, BundleRenderer} from 'vue-server-renderer';

import htmlTemplate from './htmlTemplate';

const APP_ROOT = process.env.AEDRIS_DIR || process.cwd();

export default class Backend extends Koa {
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

	/* Vue SSR bundle renderer. */
	bundleRenderer: BundleRenderer;

	constructor() {
		super();

		// Set up backend routers. Routers get mounted as middleware instead of as Routers to allow modification after mounting.
		this.router.use(compose(this.globalMiddleware));
		this.apiRouter.use(compose(this.apiMiddleware));

		// TODO: config
		this.backendRouter.use('/v1', this.apiRouter.callback());

		this.backendRouter.use('/res', koaStatic(path.resolve(APP_ROOT, 'dist/frontend-client/')));

		this.router.use('/_', this.backendRouter.callback());

		// Set up SSR
		this.createBundleRenderer();

		this.router.use((ctx) => {
			if (process.env.NODE_ENV === 'development' && !this.bundleRenderer) {
				// TODO: handle creating the bundle renderer more gracefully
				this.createBundleRenderer();

				if (!this.bundleRenderer) {
					ctx.body = 'Renderer not ready.';
					return;
				}
			}

			ctx.type = 'html';
			ctx.response.body = this.bundleRenderer.renderToStream({
				url: ctx.path,
				meta: '<title>test</title>',
			});
		});

		// Mount the global router
		this.use(this.router.callback());
	}

	createBundleRenderer() {
		try {
			// TODO: config
			this.bundleRenderer = createBundleRenderer(path.resolve(APP_ROOT, 'dist/frontend-server/vue-ssr-server-bundle.json'), {
				clientManifest: JSON.parse(fs.readFileSync(path.resolve(APP_ROOT, 'dist/frontend-client/vue-ssr-client-manifest.json'), 'utf8')),
				template: htmlTemplate,
			});
		} catch (ex) {
			if (process.env.NODE_ENV === 'development') {
				// The bundles might not exist in development - this is expected
				if (ex.code === 'ENOENT') {
					console.log('Server bundles not ready. Bundle renderer not created.');
				} else {
					console.error('error creating bundle renderer:', ex);
				}
			} else {
				// Rethrow the error in production
				throw ex;
			}
		}
	}
}
