import importDefault from '@aedris/build-tools/dist/util/importDefault';
import Vue from 'vue';
import Router, {RouterOptions} from 'vue-router';

import {FrameworkApp} from './createApp';

Vue.use(Router);

export default function createRouter(frameworkApp: FrameworkApp): Router {
	let routerOptions: RouterOptions = {
		mode: 'history',
	};

	// Try to get the default app config from the app itself
	// eslint-disable-next-line global-require
	const dynamicRouter = importDefault(require('@aedris/dynamic/@aedris/framework-vue:router'));

	if (dynamicRouter) {
		// TODO: improve this error message (module path)
		if (typeof dynamicRouter !== 'function') throw new Error('App router definition must be a function returning RouterOptions');

		routerOptions = {
			...routerOptions,
			...dynamicRouter(),
		};
	}

	// Add the 404 route
	routerOptions.routes = routerOptions.routes || [];
	routerOptions.routes.push({
		path: '*',
		component: {
			render(createElement) {
				return createElement('h1', ['404']);
			},
		},
	});

	// Let plugins modify the router options
	routerOptions = frameworkApp.hooks.initRouterOptions.call(routerOptions, this);

	// Create and bootstrap the router
	const router = new Router(routerOptions);

	if (frameworkApp.context.url) router.push(frameworkApp.context.url);

	return router;
}
