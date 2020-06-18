/// <reference types="@aedris/framework-koa/dist/extend-build-types" />
/// <reference types="@aedris/plugin-hmr/dist/extend-build-types" />

import {AedrisPlugin, Builder} from '@aedris/build-tools';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/glue-koa-vue';

function addHMRSupport(builder: Builder) {
	// Forward some of the webpack hooks to the backend, so the hot-middleware can work
	builder.hooks.beforeWatch.tap(HOOK_NAME, (b) => {
		if (builder.config.isPlugin || !builder.isDevelopment) return;

		/* TODO: we will probably need to forward both the frontend server and client bundle events to the backend so that hmr can work but also so the bundle renderer can be recreated. maybe
		propagating those events should even be the responsibility of the build tools? might also simplify parallel builds */

		const target = b.getTarget('@aedris/framework-vue:app-frontend-client');
		if (!target) throw new Error('"@aedris/framework-vue:app-frontend-client" target does not exist in beforeWatch');

		target.compiler!.hooks.done.tap({
			name: HOOK_NAME,
			stage: 100,
		}, (stats) => {
			const hmrPlugin = target.builder.getPluginInstance('@aedris/plugin-hmr');

			if (!hmrPlugin.targetRunners['@aedris/framework-koa:app-backend']?.entryProcess.backend) return;

			hmrPlugin.targetRunners['@aedris/framework-koa:app-backend'].entryProcess.backend.send({
				t: `${HOOK_NAME}:compiler:done`,
				d: [
					// See https://github.com/webpack-contrib/webpack-hot-middleware/blob/cb29abb9dde435a1ac8e9b19f82d7d36b1093198/middleware.js#L118
					stats.toJson({
						all: false,
						cached: true,
						children: true,
						modules: true,
						timings: true,
						hash: true,
					}),
				],
			});
		});

		target.compiler!.hooks.invalid.tap(HOOK_NAME, () => {
			const hmrPlugin = target.builder.getPluginInstance('@aedris/plugin-hmr');

			if (!hmrPlugin.targetRunners['@aedris/framework-koa:app-backend']?.entryProcess.backend) return;

			hmrPlugin.targetRunners['@aedris/framework-koa:app-backend'].entryProcess.backend.send({
				t: `${HOOK_NAME}:compiler:invalid`,
			});
		});
	});
}

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.usePlugin('@aedris/framework-koa');
		builder.usePlugin('@aedris/framework-vue');

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// Register ourselves as a runtime plugin when building the app
			if (!target.config.isPlugin && target.name === '@aedris/framework-koa:app-backend') {
				target.registerRuntimePlugin(HOOK_NAME, `${HOOK_NAME}/dist/backend`);
			}

			return config;
		});

		addHMRSupport(builder);
	},
};
