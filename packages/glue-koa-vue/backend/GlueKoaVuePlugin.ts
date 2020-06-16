import RuntimePluginLoader, {RuntimePlugin} from '@aedris/build-tools/dist/runtime/RuntimePluginLoader';
import {FrameworkKoaPlugin} from '@aedris/framework-koa/dist/index';
import fs from 'fs';
import path from 'path';
import {createBundleRenderer, BundleRenderer} from 'vue-server-renderer';

import htmlTemplate from './htmlTemplate';

const HOOK_NAME = '@aedris/glue-koa-vue';

const APP_ROOT = process.env.AEDRIS_DIR || process.cwd();

export class GlueKoaVuePlugin implements RuntimePlugin {
	/** The Koa framework instance. */
	koaFramework: FrameworkKoaPlugin;

	/* Vue SSR bundle renderer. */
	bundleRenderer: BundleRenderer;

	hookApp(loader: RuntimePluginLoader) {
		this.koaFramework = loader.getPlugin('@aedris/framework-koa') as FrameworkKoaPlugin;

		this.koaFramework.hooks.registerRoutes.tapPromise(HOOK_NAME, async () => {
			// Set up SSR
			this.createBundleRenderer();

			this.createSSRMiddleware();
			this.createHotMiddleware();
		});
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

	async createSSRMiddleware() {
		this.koaFramework.app.fallbackMiddleware.push((ctx) => {
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
	}

	async createHotMiddleware() {
		if (process.env.NODE_ENV !== 'development') return;

		// Lazy import as it's a development only dependency
		const {WebpackHotMiddlewareHandler} = await import('./WebpackHotMiddlewareHandler');

		const hotMiddlewareHandler = new WebpackHotMiddlewareHandler();

		// If the frontend bundle is not yet built, create a building promise to wait for it before completing any frontend requests
		if (!this.bundleRenderer) hotMiddlewareHandler.createBuildingPromise();

		this.koaFramework.app.fallbackMiddleware.unshift(hotMiddlewareHandler.koaMiddleware);
	}
}
