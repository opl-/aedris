/// <reference types="@aedris/framework-vue/dist/extend-runtime-types" />

import {RuntimePlugin, RuntimePluginLoader} from '@aedris/build-tools/dist/runtime';
import {importDefault} from '@aedris/build-tools/dist/util/importDefault';
import {SyncWaterfallHook} from 'tapable';
import Vue from 'vue';
import Vuex, {Store, StoreOptions} from 'vuex';

Vue.use(Vuex);

const HOOK_NAME = '@aedris/framework-vuex';

declare global {
	interface Window {
		__INITIAL_STATE__: any;
	}
}

export class FrameworkVuexPlugin<StoreState = any> implements RuntimePlugin {
	hooks = {
		initStoreOptions: new SyncWaterfallHook<StoreOptions<StoreState>, FrameworkVuexPlugin>(['options', 'plugin']),
	};

	store: Store<StoreState>;

	hookApp(loader: RuntimePluginLoader): void {
		const frameworkVue = loader.getPlugin('@aedris/framework-vue');

		frameworkVue.hooks.initRootOptions.tap(HOOK_NAME, (options) => {
			let storeOptions: StoreOptions<StoreState> = {};

			// Try to get the default app config from the app itself
			// FIXME: this throws an error if the module doesn't exist
			// eslint-disable-next-line global-require
			const dynamicStore = importDefault(require('@aedris/dynamic/@aedris/framework-vuex:store'));

			if (dynamicStore) {
				// TODO: improve this error message (module path)
				if (typeof dynamicStore !== 'function') throw new Error('App store definition must be a function returning StoreOptions');

				storeOptions = {
					...storeOptions,
					...dynamicStore(),
				};
			}

			storeOptions = this.hooks.initStoreOptions.call(storeOptions, this);

			this.store = new Store(storeOptions);

			return {
				...options,
				store: this.store,
			};
		});

		frameworkVue.hooks.rootCreated.tap(HOOK_NAME, (app) => {
			// TODO: make these only exist in the relevant client or server bundles
			// Expose a `rendered` listener that will be called by `vue-server-renderer`. This allows us to put the state into the context to allow sending the Vuex state after SSR to the browser.
			// eslint-disable-next-line no-param-reassign
			(app.context as Record<string, any>).rendered = () => {
				// eslint-disable-next-line no-param-reassign
				(app.context as Record<string, any>).state = app.root.$store.state;
			};

			// Replace the Vuex store state with the data passed from the backend if it exists
			// eslint-disable-next-line no-underscore-dangle
			if (globalThis.window && globalThis.window.__INITIAL_STATE__) {
				// eslint-disable-next-line no-underscore-dangle
				app.root.$store.replaceState(globalThis.window.__INITIAL_STATE__);
			}
		});
	}
}
