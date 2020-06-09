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

import {FrameworkKoaOptions} from './FrameworkKoaOptions';

const HOOK_NAME = '@aedris/framework-koa';

const TARGET_NAME = {
	plugin: {
		backend: '@aedris/framework-koa:plugin-backend',
	},
	app: {
		backend: '@aedris/framework-koa:app-backend',
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
		options.entryPoint.backend = {
			run: true,
			args: [
				// TODO: use config
				'dist/backend/backend.js',
			],
		};

		// eslint-disable-next-line no-param-reassign
		config.options['@aedris/plugin-hmr'] = options as HMRPluginOptions;

		return config;
	});
}

export default <AedrisPlugin> {
	normalizeOptions(options: undefined | FrameworkKoaOptions, config): FrameworkKoaOptions {
		const opts = (options || {}) as FrameworkKoaOptions;

		opts.backendDir = AedrisConfigHandler.resolvePath(config.rootDir, opts.backendDir || './backend', `options['${HOOK_NAME}'].backendDir`);

		return opts;
	},
	hookBuild(builder: Builder): void {
		addHMRSupport(builder);

		builder.hooks.registerTargets.tapPromise(HOOK_NAME, (b) => {
			if (builder.config.isPlugin) {
				// Create targets for plugins using standardized entry point paths for plugins
				const options = b.getPluginOptions(HOOK_NAME);

				return Promise.all([
					b.createTarget({
						name: TARGET_NAME.plugin.backend,
						context: [DefaultContext.NODE],
						entry: {
							backend: path.resolve(options.backendDir, 'index.ts'),
						},
						outputDir: './backend/',
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
						backend: '@aedris/framework-koa/dist/backend',
					},
					outputDir: './backend/',
				}),
			]);
		});

		builder.hooks.prepareWebpackConfig.tap(HOOK_NAME, (config, target) => {
			// Never externalize our own entry bundles when building the app for dynamic module resolution used in those bundles to work
			target.hooks.externalsQuery.tap(HOOK_NAME, (query) => {
				if (query.request === '@aedris/framework-koa/dist/backend') return false;
				// eslint-disable-next-line consistent-return
				return undefined;
			});

			return config;
		});
	},
};
