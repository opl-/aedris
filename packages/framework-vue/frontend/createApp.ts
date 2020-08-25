import './extend-runtime-types';

import loader, {RuntimePlugin, RuntimePluginLoader} from '@aedris/build-tools/dist/runtime';
import {SyncHook, SyncWaterfallHook} from 'tapable';
import Vue, {ComponentOptions} from 'vue';
import {RouterOptions} from 'vue-router';

import AppRoot from './component/AppRoot';
import {createRouter} from './createRouter';

const HOOK_NAME = '@aedris/framework-vue';

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

	/**
	 * Context object passed from the backend. This can also be accessed in Vue components through `this.$vnode.ssrContext`.
	 *
	 * Cannot be reassigned due to `vue-server-renderer` keeping a reference to it.
	 * */
	readonly context: AppContext;

	constructor({context}: FrameworkAppOptions) {
		this.context = context;

		this.hooks.initRootOptions.tap(HOOK_NAME, (vueOptions) => {
			// eslint-disable-next-line no-param-reassign
			vueOptions.router = createRouter(this);
			return vueOptions;
		});
	}

	hookApp(l: RuntimePluginLoader) {
		l.hooks.init.tap(HOOK_NAME, () => {
			const vueOptions = this.hooks.initRootOptions.call({} as ComponentOptions<Vue>, this);

			this.root = new AppRoot(vueOptions);

			this.hooks.rootCreated.call(this);
		});
	}
}

export async function createApp(context: AppContext = {}): Promise<FrameworkApp> {
	// Start the application
	const app = new FrameworkApp({
		context,
	});

	await loader.start(HOOK_NAME, app);

	return app;
}
