import {AedrisPlugin, Builder, DefaultContext} from '@aedris/build-tools';
import path from 'path';
import {VueLoaderPlugin} from 'vue-loader';
import VueSSRClientPlugin from 'vue-server-renderer/client-plugin';
import VueSSRServerPlugin from 'vue-server-renderer/server-plugin';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/framework';

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.hooks.registerTargets.tapPromise(HOOK_NAME, (b) => {
			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				return Promise.all([
					b.createTarget({
						name: '@aedris/framework/plugin-backend-bundle',
						context: DefaultContext.BACKEND,
						entry: {
							backend: path.resolve(b.config.backendDir, 'index.ts'),
						},
						outputDir: './backend/',
					}),
					b.createTarget({
						name: '@aedris/framework/plugin-frontend-bundle',
						context: DefaultContext.FRONTEND_SERVER,
						entry: {
							frontend: path.resolve(b.config.backendDir, 'index.ts'),
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
					context: DefaultContext.BACKEND,
					entry: {
						backend: '@aedris/framework/dist/backend',
					},
					outputDir: './backend/',
				}),
				b.createTarget({
					name: '@aedris/framework:app-frontend-client-bundle',
					context: DefaultContext.FRONTEND_CLIENT,
					entry: {
						app: '@aedris/framework/dist/entryFrontendClient',
					},
					outputDir: './frontend-client/',
				}),
				b.createTarget({
					name: '@aedris/framework:app-frontend-server-bundle',
					context: DefaultContext.FRONTEND_SERVER,
					entry: {
						frontend: '@aedris/framework/dist/entryFrontendServer',
					},
					outputDir: './frontend-server/',
				}),
			]);
		});

		builder.hooks.registerDynamicModules.tap(HOOK_NAME, (b) => {
			// TODO: config
			b.setDynamicModule(`${HOOK_NAME}:router`, path.resolve(b.config.frontendDir, 'router/'));
		});

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// Override the build-tools externals function to exclude our own entry bundles. Kinda hacky but gets the job done.
			const originalExternals = target.externals['node-externals'];
			if (originalExternals) {
				// eslint-disable-next-line no-param-reassign
				target.externals['node-externals'] = (context: string, request: string, callback: (err?: Error, result?: string) => void) => {
					if (/@aedris\/framework\/dist\/(?:backend|entryFrontend(?:Client|Server))/.test(request)) return callback(undefined, undefined);
					return (originalExternals as Function)(context, request, callback);
				};
			}

			if (target.context.startsWith('frontend')) {
				// Try matching the `.vue` extension
				config.resolve.extensions.add('.vue');

				// Use `vue-loader` for `.vue` files
				const vueRule = config.module.rule('vue').test(/\.vue$/);
				vueRule.use('vue-loader').loader('vue-loader');

				// Use the VueLoaderPlugin to enable using single file components
				// TODO: config
				config.plugin('vue-loader').use(VueLoaderPlugin);

				if (!target.config.isPlugin) {
					// Use the SSR plugin to create a server bundle
					if (target.context === DefaultContext.FRONTEND_SERVER) config.plugin('vue-ssr').use(VueSSRServerPlugin);
					// Use the SSR plugin to create a client bundle
					else if (target.context === DefaultContext.FRONTEND_CLIENT) config.plugin('vue-ssr').use(VueSSRClientPlugin);
				}

				// Enable ts-loader option to make TypeScript work with Vue single file components
				config.module.rule('typescript').use('ts-loader').options({
					appendTsSuffixTo: [/\.vue$/],
				});
			}

			return config;
		});
	},
};
