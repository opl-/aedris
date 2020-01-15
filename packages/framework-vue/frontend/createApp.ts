import {RuntimePlugin} from '@aedris/build-tools/dist/RuntimePluginLoader';
import {SyncHook, SyncWaterfallHook} from 'tapable';
import Vue, {ComponentOptions} from 'vue';
import {RouterOptions} from 'vue-router';

import AppRoot from './component/AppRoot';
import createRouter from './createRouter';
import runtimePluginLoader from './runtimePluginLoader';

export interface AppContext {
	/** Path to render. `undefined` in a browser context. */
	url?: string;
}

export interface FrameworkAppOptions {
	context: AppContext;
}

export class FrameworkApp implements RuntimePlugin {
	hooks = {
		initRootOptions: new SyncWaterfallHook<ComponentOptions<Vue>, FrameworkApp>(['rootOptions', 'frameworkApp']),
		initRouterOptions: new SyncWaterfallHook<RouterOptions, FrameworkApp>(['routerOptions', 'frameworkApp']),
		rootCreated: new SyncHook<FrameworkApp>(['frameworkApp']),
	};

	root: Vue;
	context: AppContext;

	constructor({context}: FrameworkAppOptions) {
		this.context = context;

		this.hooks.initRootOptions.tap('@aedris/framework', (vueOptions) => {
			// eslint-disable-next-line no-param-reassign
			vueOptions.router = createRouter(this);
			return vueOptions;
		});
	}

	hookApp() {
		const vueOptions = this.hooks.initRootOptions.call({} as ComponentOptions<Vue>, this);

		this.root = new AppRoot(vueOptions);

		this.hooks.rootCreated.call(this);
	}
}

export default async function createApp(context: AppContext = {}): Promise<FrameworkApp> {
	// Start the application
	const app = new FrameworkApp({
		context,
	});

	await runtimePluginLoader.start('@aedris/framework', app);

	return app;
}
