// Type extensions
import './extend-types';

import {
	AedrisConfigHandler,
	AedrisPlugin,
	Builder,
	DefaultContext,
} from '@aedris/build-tools';
import {HMRPluginInstance, HMRPluginOptions} from '@aedris/plugin-hmr';
import path from 'path';

import {FrameworkOptions} from './FrameworkOptions';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/framework';

const TARGET_NAME = {
	plugin: {
		backend: '@aedris/framework:plugin-backend',
		frontend: '@aedris/framework:plugin-frontend',
	},
	app: {
		backend: '@aedris/framework:app-backend',
		frontendClient: '@aedris/framework:app-frontend-client',
		frontendServer: '@aedris/framework:app-frontend-server',
	},
};

export {
	TARGET_NAME,
};

function addHMRSupport(builder: Builder) {
	builder.usePlugin('@aedris/plugin-hmr');

	// Override plugin-hmr settings to run the backend and include HMR client in the frontend bundle
	builder.hooks.normalizeConfig.tap(HOOK_NAME, (config) => {
		if (builder.config.isPlugin || !builder.isDevelopment) return config;

		const options: Partial<Exclude<HMRPluginOptions, false>> = config.options['@aedris/plugin-hmr'] || {};

		options.entryPoint = options.entryPoint || {};

		// TODO: use overrides
		options.entryPoint.backend = {
			run: true,
			args: [
				// TODO: use config
				'dist/backend/backend.js',
			],
		};
		options.entryPoint.app = {
			hmrClient: true,
		};

		// eslint-disable-next-line no-param-reassign
		config.options['@aedris/plugin-hmr'] = options as HMRPluginOptions;

		return config;
	});

	// Forward some of the webpack hooks to the backend, so the hot-middleware can work
	builder.hooks.beforeWatch.tap(HOOK_NAME, (b) => {
		if (builder.config.isPlugin || !builder.isDevelopment) return;

		/* TODO: we will probably need to forward both the frontend server and client bundle events to the backend so that hmr can work but also so the bundle renderer can be recreated. maybe
		propagating those events should even be the responsibility of the build tools? might also simplify parallel builds */

		const target = b.getTarget(TARGET_NAME.app.frontendClient);
		if (!target) throw new Error(`${JSON.stringify(TARGET_NAME.app.frontendClient)} target does not exist in afterLoad`);

		target.compiler!.hooks.done.tap({
			name: HOOK_NAME,
			stage: 100,
		}, (stats) => {
			const hmrPlugin = target.builder.getPluginInstance('@aedris/plugin-hmr') as HMRPluginInstance;

			if (!hmrPlugin.targetRunners[TARGET_NAME.app.backend]?.entryProcess.backend) return;

			hmrPlugin.targetRunners[TARGET_NAME.app.backend].entryProcess.backend.send({
				t: '@aedris/framework:compiler:done',
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
			const hmrPlugin = target.builder.getPluginInstance('@aedris/plugin-hmr') as HMRPluginInstance;

			if (!hmrPlugin.targetRunners[TARGET_NAME.app.backend]?.entryProcess.backend) return;

			hmrPlugin.targetRunners[TARGET_NAME.app.backend].entryProcess.backend.send({
				t: '@aedris/framework:compiler:invalid',
			});
		});
	});
}

export default <AedrisPlugin> {
	normalizeOptions(options: undefined | FrameworkOptions, config): FrameworkOptions {
		const opts = (options || {}) as FrameworkOptions;

		opts.frontendDir = AedrisConfigHandler.resolvePath(config.rootDir, opts.frontendDir || './frontend', "options['@aedris/framework'].frontendDir");
		opts.backendDir = AedrisConfigHandler.resolvePath(config.rootDir, opts.backendDir || './backend', "options['@aedris/framework'].backendDir");

		return opts;
	},
	hookBuild(builder: Builder): void {
		builder.usePlugin('@aedris/vue');

		addHMRSupport(builder);

		builder.hooks.registerTargets.tapPromise(HOOK_NAME, (b) => {
			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				const options = b.getPluginOptions('@aedris/framework');

				return Promise.all([
					b.createTarget({
						name: TARGET_NAME.plugin.backend,
						context: [DefaultContext.NODE],
						entry: {
							backend: path.resolve(options.backendDir, 'index.ts'),
						},
						outputDir: './backend/',
					}),
					b.createTarget({
						name: TARGET_NAME.plugin.frontend,
						context: [DefaultContext.WEB, 'vue', DefaultContext.NODE],
						entry: {
							frontend: path.resolve(options.frontendDir, 'index.ts'),
						},
						outputDir: './frontend/',
					}),
				]);
			}

			// Create targets for apps using our own entry points to allow skipping boilerplate code in projects
			// TODO: this is going to skip all the project files and we don't want to skip those >.< (use generated entry)
			return Promise.all([
				b.createTarget({
					name: TARGET_NAME.app.backend,
					context: [DefaultContext.NODE],
					entry: {
						backend: '@aedris/framework/dist/backend',
					},
					outputDir: './backend/',
				}),
				b.createTarget({
					name: TARGET_NAME.app.frontendClient,
					context: [DefaultContext.WEB, 'vue'],
					entry: {
						app: '@aedris/framework/dist/entryFrontendClient',
					},
					outputDir: './frontend-client/',
				}),
				b.createTarget({
					name: TARGET_NAME.app.frontendServer,
					context: [DefaultContext.WEB, 'vue', DefaultContext.NODE],
					entry: {
						frontend: '@aedris/framework/dist/entryFrontendServer',
					},
					outputDir: './frontend-server/',
				}),
			]);
		});

		builder.hooks.registerDynamicModules.tap(HOOK_NAME, (b) => {
			const options = b.getPluginOptions('@aedris/framework');

			// TODO: config
			b.setDynamicModule(`${HOOK_NAME}:router`, path.resolve(options.frontendDir, 'router/'));
		});

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// Override the build-tools externals function to never externalize our own entry bundles for dynamic module resolution. Kinda hacky but gets the job done.
			const originalExternals = target.externals['node-externals'];
			if (originalExternals) {
				// eslint-disable-next-line no-param-reassign
				target.externals['node-externals'] = (context: string, request: string, callback: (err?: Error, result?: string) => void) => {
					if (/@aedris\/framework\/dist\/(?:backend|entryFrontend(?:Client|Server))/.test(request)) return callback(undefined, undefined);
					return (originalExternals as Function)(context, request, callback);
				};
			}

			return config;
		});
	},
};
