/// <reference types="@aedris/framework-vue/dist/extend-build-types" />

import {AedrisPlugin} from '@aedris/build-tools';
import {TARGET_NAME as VUE_TARGET_NAMES} from '@aedris/framework-vue';
import path from 'path';

const HOOK_NAME = '@aedris/framework-vuex';

export default <AedrisPlugin> {
	hookBuild(builder): void {
		builder.usePlugin('@aedris/framework-vue');

		builder.hooks.registerDynamicModules.tap(HOOK_NAME, (target) => {
			// This Vuex plugin has no special behavior when building plugins
			if (target.config.isPlugin) return;

			if (([VUE_TARGET_NAMES.app.frontendClient, VUE_TARGET_NAMES.app.frontendServer] as string[]).includes(target.name)) {
				const options = target.getPluginOptions('@aedris/framework-vue');

				// TODO: config
				target.setDynamicModule(`${HOOK_NAME}:store`, path.resolve(options.frontendDir, 'store/'));

				target.registerRuntimePlugin(HOOK_NAME, `${HOOK_NAME}/dist/frontend`);
			}
		});

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			if (!target.config.isPlugin && ([VUE_TARGET_NAMES.app.frontendClient, VUE_TARGET_NAMES.app.frontendServer] as string[]).includes(target.name)) {
				// Never externalize our own entry bundles when building the app for dynamic module resolution used in those bundles to work
				target.hooks.externalsQuery.tap(HOOK_NAME, (query) => {
					if (query.request === `${HOOK_NAME}/dist/frontend`) return false;
					// eslint-disable-next-line consistent-return
					return undefined;
				});
			}

			return config;
		});
	},
};
