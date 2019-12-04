// Type extensions
import './extend-types';

import {AedrisPlugin, Builder, DefaultContext} from '@aedris/build-tools';
import {AedrisConfigHandler} from '@aedris/build-tools/dist/AedrisConfigHandler';
import path from 'path';

import {FrameworkOptions} from './FrameworkOptions';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/framework';

export default <AedrisPlugin> {
	normalizeOptions(options: undefined | FrameworkOptions, config): FrameworkOptions {
		const opts = (options || {}) as FrameworkOptions;

		opts.frontendDir = AedrisConfigHandler.resolvePath(config.rootDir, opts.frontendDir || './frontend', "options['@aedris/framework'].frontendDir");
		opts.backendDir = AedrisConfigHandler.resolvePath(config.rootDir, opts.backendDir || './backend', "options['@aedris/framework'].backendDir");

		return opts;
	},
	hookBuild(builder: Builder): void {
		builder.usePlugin('@aedris/vue');

		builder.hooks.registerTargets.tapPromise(HOOK_NAME, (b) => {
			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				const options = b.getPluginOptions('@aedris/framework');

				return Promise.all([
					b.createTarget({
						name: '@aedris/framework/plugin-backend-bundle',
						context: [DefaultContext.NODE],
						entry: {
							backend: path.resolve(options.backendDir, 'index.ts'),
						},
						outputDir: './backend/',
					}),
					b.createTarget({
						name: '@aedris/framework/plugin-frontend-bundle',
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
					name: '@aedris/framework:app-backend-bundle',
					context: [DefaultContext.NODE],
					entry: {
						backend: '@aedris/framework/dist/backend',
					},
					outputDir: './backend/',
				}),
				b.createTarget({
					name: '@aedris/framework:app-frontend-client-bundle',
					context: [DefaultContext.WEB, 'vue'],
					entry: {
						app: '@aedris/framework/dist/entryFrontendClient',
					},
					outputDir: './frontend-client/',
				}),
				b.createTarget({
					name: '@aedris/framework:app-frontend-server-bundle',
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
