// Type extensions
import './extend-types';

import {
	AedrisConfigHandler,
	AedrisPlugin,
	Builder,
	DefaultContext,
} from '@aedris/build-tools';
import {HMRPluginOptions} from '@aedris/plugin-hmr';
import path from 'path';

import {FrameworkVueOptions} from './FrameworkVueOptions';

// TODO: https://vue-loader.vuejs.org/options.html has some interesting options like cacheDirectory

const HOOK_NAME = '@aedris/framework-vue';

const TARGET_NAME = {
	plugin: {
		frontend: '@aedris/framework-vue:plugin-frontend',
	},
	app: {
		frontendClient: '@aedris/framework-vue:app-frontend-client',
		frontendServer: '@aedris/framework-vue:app-frontend-server',
	},
} as const;

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
		options.entryPoint.app = {
			hmrClient: true,
		};

		// eslint-disable-next-line no-param-reassign
		config.options['@aedris/plugin-hmr'] = options as HMRPluginOptions;

		return config;
	});
}

export default <AedrisPlugin> {
	normalizeOptions(options: undefined | FrameworkVueOptions, config): FrameworkVueOptions {
		const opts = (options || {}) as FrameworkVueOptions;

		opts.frontendDir = AedrisConfigHandler.resolvePath(config.rootDir, opts.frontendDir || './frontend', `options['${HOOK_NAME}'].frontendDir`);

		return opts;
	},
	hookBuild(builder: Builder): void {
		builder.usePlugin('@aedris/vue');

		addHMRSupport(builder);

		builder.hooks.registerTargets.tapPromise(HOOK_NAME, (b) => {
			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				const options = b.getPluginOptions(HOOK_NAME);

				return Promise.all([
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
					name: TARGET_NAME.app.frontendClient,
					context: [DefaultContext.WEB, 'vue'],
					entry: {
						app: '@aedris/framework-vue/dist/entryFrontendClient',
					},
					outputDir: './frontend-client/',
				}),
				b.createTarget({
					name: TARGET_NAME.app.frontendServer,
					context: [DefaultContext.WEB, 'vue', DefaultContext.NODE],
					entry: {
						frontend: '@aedris/framework-vue/dist/entryFrontendServer',
					},
					outputDir: './frontend-server/',
				}),
			]);
		});

		builder.hooks.registerDynamicModules.tap(HOOK_NAME, (b) => {
			const options = b.getPluginOptions(HOOK_NAME);

			// TODO: config
			b.setDynamicModule(`${HOOK_NAME}:router`, path.resolve(options.frontendDir, 'router/'));
		});

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// Never externalize our own entry bundles when building the app for dynamic module resolution used in those bundles to work
			target.hooks.externalsQuery.tap(HOOK_NAME, (query) => {
				if (/^@aedris\/framework-vue\/dist\/(?:entryFrontend(?:Client|Server)$)/.test(query.request)) return false;
				// eslint-disable-next-line consistent-return
				return undefined;
			});

			return config;
		});
	},
};
