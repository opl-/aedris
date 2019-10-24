import {AedrisPlugin, Builder, DefaultContext} from '@aedris/build-tools';
import path from 'path';
import {VueLoaderPlugin} from 'vue-loader';
import VueSSRClientPlugin from 'vue-server-renderer/client-plugin';
import VueSSRServerPlugin from 'vue-server-renderer/server-plugin';
import merge from 'webpack-merge';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/framework';

export default <AedrisPlugin> {
	hookBuild(builder: Builder): void {
		builder.hooks.registerTargets.tapPromise(HOOK_NAME, (b) => {
			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				return Promise.all([
					b.createTarget({
						context: DefaultContext.BACKEND,
						entry: {
							backend: path.resolve(b.config.backendDir, 'index.ts'),
						},
						outputDir: './backend/',
					}),
					b.createTarget({
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
					context: DefaultContext.BACKEND,
					entry: {
						backend: '@aedris/framework/dist/backend',
					},
					outputDir: './backend/',
				}),
				b.createTarget({
					context: DefaultContext.FRONTEND_CLIENT,
					entry: {
						app: '@aedris/framework/dist/entryFrontendClient',
					},
					outputDir: './frontend-client/',
				}),
				b.createTarget({
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

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (webpackConfig, target) => {
			let output = webpackConfig;

			if (target.context.startsWith('frontend')) {
				output = merge(output, {
					resolve: {
						// TODO: verify the array gets merged correctly
						extensions: ['.vue'],
					},
					module: {
						rules: [{
							test: /\.vue$/,
							loader: 'vue-loader',
						}],
					},
					plugins: [
						// TODO: config
						new VueLoaderPlugin(),
						...(target.builder.config.isPlugin ? [
							// Do not create SSR bundles for plugins
						] : target.context === DefaultContext.FRONTEND_SERVER ? [
							// Use the SSR plugin to create a server bundle
							new VueSSRServerPlugin(),
						] : target.context === DefaultContext.FRONTEND_CLIENT ? [
							// Use the SSR plugin to create a client bundle
							new VueSSRClientPlugin(),
						] : []),
					],
				});

				// Enable ts-loader option to make TypeScript work with Vue single file components
				// Unnecessary if to make TypeScript compiler shut up
				if (output.module && output.module.rules) {
					output.module.rules.filter((r) => r.loader === 'ts-loader').forEach((rule) => {
						/* eslint-disable no-param-reassign */
						rule.options = rule.options || {};
						(rule.options as any).appendTsSuffixTo = [/\.vue$/];
						/* eslint-enable no-param-reassign */
					});
				}
			}

			return output;
		});
	},
};
