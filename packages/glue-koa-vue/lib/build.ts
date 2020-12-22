/// <reference types="@aedris/framework-koa/dist/extend-build-types" />
/// <reference types="@aedris/plugin-hmr/dist/extend-build-types" />

import {AedrisPlugin, Builder, BuildTarget} from '@aedris/build-tools';
import {TARGET_NAME as KOA_TARGET_NAME} from '@aedris/framework-koa';
import {TARGET_NAME as VUE_TARGET_NAME} from '@aedris/framework-vue';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/glue-koa-vue';

function addHMRSupport(builder: Builder) {
	// Forward some of the webpack hooks to the backend, so the hot-middleware can work
	builder.hooks.beforeWatch.tap(HOOK_NAME, (b) => {
		if (builder.config.isPlugin || !builder.isDevelopment) return;

		// TODO: propagating those events should be the responsibility of the build tools to simplify parallel builds. the ability to send messages between targets likely won't be unique to this plugin
		function sendMessage(targetName: string, message: object) {
			const target = b.getTarget(targetName);
			if (!target) return void console.warn(`[glue-koa-vue] Could not send message to target ${JSON.stringify(targetName)}`);

			const hmrPlugin = target.builder.getPluginInstance('@aedris/plugin-hmr');

			const entryProcess = hmrPlugin.targetRunners[KOA_TARGET_NAME.app.backend]?.entryProcess.backend;
			if (!entryProcess) return;

			entryProcess.send(message);
		}

		/** Stores the list of targets that the backend should wait for before letting frontend requests through. */
		const blockingTargets: string[] = [];

		function forwardCompilerEvents(fromTarget: string) {
			const target = b.getTarget(fromTarget);
			if (!target) throw new Error(`${JSON.stringify(fromTarget)} target does not exist in beforeWatch`);

			blockingTargets.push(fromTarget);

			target.compiler!.hooks.done.tap({
				name: `${HOOK_NAME}:${fromTarget}`,
				stage: 100,
			}, (stats) => {
				const blockingTargetIndex = blockingTargets.indexOf(fromTarget);
				if (blockingTargetIndex !== -1) blockingTargets.splice(blockingTargetIndex, 1);

				sendMessage(KOA_TARGET_NAME.app.backend, {
					t: `${HOOK_NAME}:compiler:done`,
					d: {
						target: fromTarget,
						// See https://github.com/webpack-contrib/webpack-hot-middleware/blob/cb29abb9dde435a1ac8e9b19f82d7d36b1093198/middleware.js#L118
						stats: stats.toJson({
							all: false,
							cached: true,
							children: true,
							modules: true,
							timings: true,
							hash: true,
						}),
					},
				});
			});

			target.compiler!.hooks.invalid.tap(`${HOOK_NAME}:${fromTarget}`, () => {
				if (!blockingTargets.includes(fromTarget)) blockingTargets.push(fromTarget);

				sendMessage(KOA_TARGET_NAME.app.backend, {
					t: `${HOOK_NAME}:compiler:invalid`,
					d: {
						target: fromTarget,
					},
				});
			});
		}

		forwardCompilerEvents(VUE_TARGET_NAME.app.frontendClient);
		// TODO: vue ssr bundle only
		forwardCompilerEvents(VUE_TARGET_NAME.app.frontendServer);

		// Once the backend exists, send initial invalid events to signal the backend that the targets exist
		b.getTarget('@aedris/framework-koa:app-backend')?.compiler?.hooks.done.tapPromise({
			name: HOOK_NAME,
			// Run the tap late to allow the HMR plugin to start the backend process
			stage: 100,
		}, async () => {
			blockingTargets.forEach((targetName) => {
				sendMessage(KOA_TARGET_NAME.app.backend, {
					t: `${HOOK_NAME}:compiler:invalid`,
					d: {
						target: targetName,
					},
				});
			});
		});
	});
}

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.usePlugin('@aedris/framework-koa');
		builder.usePlugin('@aedris/framework-vue');

		addHMRSupport(builder);
	},
	hookTarget(buildTarget: BuildTarget): void {
		if (!buildTarget.config.isPlugin && buildTarget.name === KOA_TARGET_NAME.app.backend) {
			// Register ourselves as a runtime plugin when building the app
			buildTarget.hooks.prepareTarget.tap(HOOK_NAME, (target) => {
				target.registerRuntimePlugin(HOOK_NAME, `${HOOK_NAME}/dist/backend`);
			});
		}
	},
};
